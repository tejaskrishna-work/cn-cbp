/* -*- Mode:C++; c-file-style:"gnu"; indent-tabs-mode:nil; -*- */
/*
 * Course-Based Project (CBP): TCP Congestion Control Evaluation
 * Evaluates Tahoe, Reno, NewReno, and Cubic over a Bottleneck Dumbbell Topology.
 * Compatible with NS-3.35 through NS-3.41+
 */

#include <iostream>
#include <fstream>
#include <string>
#include "ns3/core-module.h"
#include "ns3/network-module.h"
#include "ns3/internet-module.h"
#include "ns3/point-to-point-module.h"
#include "ns3/applications-module.h"
#include "ns3/error-model.h"
#include "ns3/tcp-header.h"
#include "ns3/traffic-control-module.h"
#include "ns3/flow-monitor-module.h"

using namespace ns3;

NS_LOG_COMPONENT_DEFINE("TcpVariantsDumbbell");

// Global trace output streams
std::ofstream g_cwndStream;
std::ofstream g_rttStream;
std::ofstream g_queueStream;
std::ofstream g_dropStream;
std::ofstream g_throughputStream;

uint64_t g_lastTotalRx = 0;
double g_throughputInterval = 0.1; // seconds

// Trace Cwnd and ssthresh changes
static void
CwndTracer(uint32_t oldval, uint32_t newval)
{
    g_cwndStream << Simulator::Now().GetSeconds() << "\t"
                 << oldval << "\t"
                 << newval << std::endl;
}

// Trace RTT changes
static void
RttTracer(Time oldval, Time newval)
{
    g_rttStream << Simulator::Now().GetSeconds() << "\t"
                << oldval.GetMilliSeconds() << "\t"
                << newval.GetMilliSeconds() << std::endl;
}

// Trace queue drops at the bottleneck
static void
QueueDropTracer(Ptr<const Packet> p)
{
    g_dropStream << Simulator::Now().GetSeconds() << "\t"
                 << p->GetSize() << "\t"
                 << "DROP_QUEUE_OVERFLOW" << std::endl;
}

// Trace queue size
static void
QueueSizeTracer(uint32_t oldSize, uint32_t newSize)
{
    g_queueStream << Simulator::Now().GetSeconds() << "\t"
                  << newSize << std::endl;
}

// Periodic throughput calculation
static void
CalculateThroughput(Ptr<PacketSink> sink, double interval)
{
    double now = Simulator::Now().GetSeconds();
    uint64_t totalRx = sink->GetTotalRx();
    double curThroughput = (totalRx - g_lastTotalRx) * 8.0 / (interval * 1000000.0); // Mbps
    g_lastTotalRx = totalRx;

    g_throughputStream << now << "\t" << curThroughput << std::endl;

    Simulator::Schedule(Seconds(interval), &CalculateThroughput, sink, interval);
}

// Connect socket trace sources after socket is created by BulkSendApplication
static void
TraceSocket(Ptr<Application> app)
{
    Ptr<BulkSendApplication> bulk = DynamicCast<BulkSendApplication>(app);
    if (!bulk) return;

    Ptr<Socket> socket = bulk->GetSocket();
    if (socket)
    {
        socket->TraceConnectWithoutContext("CongestionWindow", MakeCallback(&CwndTracer));
        socket->TraceConnectWithoutContext("RTT", MakeCallback(&RttTracer));
    }
}

int main(int argc, char *argv[])
{
    std::string transportProt = "TcpCubic"; // TcpTahoe, TcpLinuxReno, TcpNewReno, TcpCubic
    std::string bottleneckBandwidth = "10Mbps";
    std::string bottleneckDelay = "20ms";
    std::string accessBandwidth = "100Mbps";
    std::string accessDelay = "2ms";
    uint32_t queueSizePackets = 50;
    double packetLossRate = 0.001; // 0.1% random error
    double simTime = 20.0;         // seconds
    bool enablePcap = false;
    std::string outputDir = "results";

    CommandLine cmd(__FILE__);
    cmd.AddValue("transportProt", "Transport protocol to use: TcpTahoe, TcpLinuxReno, TcpNewReno, TcpCubic", transportProt);
    cmd.AddValue("bottleneckBandwidth", "Bottleneck link bandwidth", bottleneckBandwidth);
    cmd.AddValue("bottleneckDelay", "Bottleneck link delay", bottleneckDelay);
    cmd.AddValue("accessBandwidth", "Access link bandwidth", accessBandwidth);
    cmd.AddValue("accessDelay", "Access link delay", accessDelay);
    cmd.AddValue("queueSize", "Bottleneck queue size in packets", queueSizePackets);
    cmd.AddValue("packetLossRate", "Random packet loss rate on bottleneck link", packetLossRate);
    cmd.AddValue("simTime", "Simulation time in seconds", simTime);
    cmd.AddValue("enablePcap", "Enable PCAP generation", enablePcap);
    cmd.AddValue("outputDir", "Output directory for trace files", outputDir);
    cmd.Parse(argc, argv);

    std::cout << "========================================================\n"
              << " NS-3 TCP Congestion Control Evaluation\n"
              << " Protocol: " << transportProt << "\n"
              << " Bottleneck: " << bottleneckBandwidth << " / " << bottleneckDelay << "\n"
              << " Packet Loss: " << (packetLossRate * 100.0) << "%\n"
              << " Queue Capacity: " << queueSizePackets << " packets\n"
              << " Duration: " << simTime << "s\n"
              << "========================================================" << std::endl;

    // Set TCP Protocol Type
    std::string tcpTypeId = "ns3::" + transportProt;
    Config::SetDefault("ns3::TcpL4Protocol::SocketType", StringValue(tcpTypeId));
    Config::SetDefault("ns3::TcpSocket::SegmentSize", UintegerValue(1460)); // Standard MSS

    // Create Trace Files
    std::string prefix = outputDir + "/" + transportProt + "_loss_" + std::to_string(packetLossRate);
    g_cwndStream.open(prefix + "_cwnd.data");
    g_rttStream.open(prefix + "_rtt.data");
    g_queueStream.open(prefix + "_queue.data");
    g_dropStream.open(prefix + "_drops.data");
    g_throughputStream.open(prefix + "_throughput.data");

    // Headers
    g_cwndStream << "# Time(s)\tOldCwnd(B)\tNewCwnd(B)" << std::endl;
    g_rttStream << "# Time(s)\tOldRtt(ms)\tNewRtt(ms)" << std::endl;
    g_queueStream << "# Time(s)\tQueueSize(Pkts)" << std::endl;
    g_dropStream << "# Time(s)\tPacketBytes\tReason" << std::endl;
    g_throughputStream << "# Time(s)\tThroughput(Mbps)" << std::endl;

    // Topology: Dumbbell
    // [n0 (Sender)] ----(Access)----> [r0] ====(Bottleneck)====> [r1] ----(Access)----> [n1 (Receiver)]
    NodeContainer senders, bottleneckRouters, receivers;
    senders.Create(1);
    bottleneckRouters.Create(2);
    receivers.Create(1);

    // Install Internet Stack
    InternetStackHelper internet;
    internet.Install(senders);
    internet.Install(bottleneckRouters);
    internet.Install(receivers);

    // Access Link: Sender -> R0
    PointToPointHelper accessLink;
    accessLink.SetDeviceAttribute("DataRate", StringValue(accessBandwidth));
    accessLink.SetChannelAttribute("Delay", StringValue(accessDelay));

    NetDeviceContainer devS0R0 = accessLink.Install(senders.Get(0), bottleneckRouters.Get(0));

    // Access Link: R1 -> Receiver
    NetDeviceContainer devR1D0 = accessLink.Install(bottleneckRouters.Get(1), receivers.Get(0));

    // Bottleneck Link: R0 -> R1
    PointToPointHelper bottleneckLink;
    bottleneckLink.SetDeviceAttribute("DataRate", StringValue(bottleneckBandwidth));
    bottleneckLink.SetChannelAttribute("Delay", StringValue(bottleneckDelay));
    bottleneckLink.SetQueue("ns3::DropTailQueue<Packet>", "MaxSize", StringValue(std::to_string(queueSizePackets) + "p"));

    NetDeviceContainer devR0R1 = bottleneckLink.Install(bottleneckRouters.Get(0), bottleneckRouters.Get(1));

    // Introduce Error Model (Random Link Loss) on the bottleneck
    if (packetLossRate > 0.0)
    {
        Ptr<RateErrorModel> em = CreateObject<RateErrorModel>();
        em->SetAttribute("ErrorRate", DoubleValue(packetLossRate));
        em->SetAttribute("ErrorUnit", StringValue("ERROR_UNIT_PACKET"));
        devR0R1.Get(1)->SetAttribute("ReceiveErrorModel", PointerValue(em));
    }

    // IP Addressing
    Ipv4AddressHelper ipv4;
    ipv4.SetBase("10.1.1.0", "255.255.255.0");
    Ipv4InterfaceContainer ifS0R0 = ipv4.Assign(devS0R0);

    ipv4.SetBase("10.1.2.0", "255.255.255.0");
    Ipv4InterfaceContainer ifR0R1 = ipv4.Assign(devR0R1);

    ipv4.SetBase("10.1.3.0", "255.255.255.0");
    Ipv4InterfaceContainer ifR1D0 = ipv4.Assign(devR1D0);

    Ipv4GlobalRoutingHelper::PopulateRoutingTables();

    // Applications: BulkSend (FTP-like large payload) on Sender
    uint16_t sinkPort = 9000;
    Address sinkAddress(InetSocketAddress(ifR1D0.GetAddress(1), sinkPort));
    PacketSinkHelper packetSinkHelper("ns3::TcpSocketFactory", InetSocketAddress(Ipv4Address::GetAny(), sinkPort));
    ApplicationContainer sinkApps = packetSinkHelper.Install(receivers.Get(0));
    sinkApps.Start(Seconds(0.0));
    sinkApps.Stop(Seconds(simTime + 1.0));

    BulkSendHelper source("ns3::TcpSocketFactory", sinkAddress);
    source.SetAttribute("MaxBytes", UintegerValue(0)); // Unlimited data
    ApplicationContainer sourceApps = source.Install(senders.Get(0));
    sourceApps.Start(Seconds(1.0));
    sourceApps.Stop(Seconds(simTime));

    // Schedule socket trace hook after startup
    Simulator::Schedule(Seconds(1.0001), &TraceSocket, sourceApps.Get(0));

    // Schedule periodic throughput calculation
    Ptr<PacketSink> sink = DynamicCast<PacketSink>(sinkApps.Get(0));
    Simulator::Schedule(Seconds(1.0 + g_throughputInterval), &CalculateThroughput, sink, g_throughputInterval);

    // PCAP tracing
    if (enablePcap)
    {
        bottleneckLink.EnablePcapAll(outputDir + "/dumbbell-" + transportProt);
    }

    // FlowMonitor setup
    FlowMonitorHelper flowmon;
    Ptr<FlowMonitor> monitor = flowmon.InstallAll();

    // Run Simulation
    Simulator::Stop(Seconds(simTime + 1.0));
    Simulator::Run();

    // Collect FlowMonitor Statistics
    monitor->CheckForLostPackets();
    Ptr<Ipv4FlowClassifier> classifier = DynamicCast<Ipv4FlowClassifier>(flowmon.GetClassifier());
    std::map<FlowId, FlowMonitor::FlowStats> stats = monitor->GetFlowStats();

    std::cout << "\n================ FlowMonitor Performance Summary ================\n";
    for (std::map<FlowId, FlowMonitor::FlowStats>::const_iterator i = stats.begin(); i != stats.end(); ++i)
    {
        Ipv4FlowClassifier::FiveTuple t = classifier->FindFlow(i->first);
        if (t.sourceAddress == ifS0R0.GetAddress(0))
        {
            double duration = i->second.timeLastRxPacket.GetSeconds() - i->second.timeFirstTxPacket.GetSeconds();
            double throughputMbps = (duration > 0) ? (i->second.rxBytes * 8.0 / duration / 1024 / 1024) : 0;
            double pdr = (i->second.txPackets > 0) ? (100.0 * i->second.rxPackets / i->second.txPackets) : 0;

            std::cout << "Flow ID: " << i->first << " (" << t.sourceAddress << " -> " << t.destinationAddress << ")\n"
                      << "  Tx Packets:         " << i->second.txPackets << "\n"
                      << "  Rx Packets:         " << i->second.rxPackets << "\n"
                      << "  Lost Packets:       " << i->second.lostPackets << "\n"
                      << "  Packet Delivery:    " << pdr << " %\n"
                      << "  Overall Throughput: " << throughputMbps << " Mbps\n"
                      << "  Mean Delay:         " << (i->second.rxPackets > 0 ? (i->second.delaySum.GetMilliSeconds() / i->second.rxPackets) : 0) << " ms\n";
        }
    }
    std::cout << "=================================================================\n";

    // Close files and finish
    g_cwndStream.close();
    g_rttStream.close();
    g_queueStream.close();
    g_dropStream.close();
    g_throughputStream.close();

    Simulator::Destroy();
    return 0;
}

