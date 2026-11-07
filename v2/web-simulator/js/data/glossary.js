/**
 * Computer Networks Glossary & Tooltip Database
 * Contains definitions, RFC mathematical equations, and practical insights.
 */

export const GLOSSARY = {
    cwnd: {
        title: "Congestion Window (cwnd)",
        formula: "W_new = W_old + 1 (Slow Start) | W_new = W_old + 1/W (AIMD)",
        definition: "The maximum amount of unacknowledged data (in MSS segments or bytes) that the sender is allowed to transmit without receiving an ACK. Regulated dynamically by the congestion control algorithm to avoid network overload.",
        context: "Expressed in MSS packets (1 MSS = 1460 Bytes). Together with rwnd (receiver advertised window), it caps in-flight packets: FlightSize ≤ min(cwnd, rwnd)."
    },
    ssthresh: {
        title: "Slow Start Threshold (ssthresh)",
        formula: "ssthresh = max(2, ⌊cwnd / 2⌋) on loss detection",
        definition: "The boundary marking the transition between Slow Start (exponential window growth) and Congestion Avoidance (linear AIMD growth).",
        context: "When cwnd < ssthresh, TCP increases cwnd by 1 MSS per ACK (doubling every RTT). When cwnd ≥ ssthresh, TCP adds only 1 MSS per RTT to prevent sudden buffer overflow."
    },
    throughput: {
        title: "Instantaneous Throughput",
        formula: "Throughput = (Delivered Bits in Window Δt) / Δt",
        definition: "The raw rate at which digital data is successfully transferred across the physical communication link over the current measurement interval.",
        context: "Includes data payload, headers, and any retransmitted packets. Contrast with Goodput."
    },
    goodput: {
        title: "Average Goodput (Useful Delivery)",
        formula: "Goodput = (Total Application Payload Bits Delivered) / Total Time",
        definition: "The effective, useful data rate delivered to the destination application layer, strictly excluding retransmitted packets and protocol header overheads.",
        context: "Goodput is always ≤ Throughput. When packet loss occurs, throughput may stay high due to duplicate retransmissions while goodput collapses."
    },
    qdelay: {
        title: "Queuing Delay (Buffer Latency)",
        formula: "D_queue = (Packets in Queue × MSS × 8) / Bottleneck_Bandwidth",
        definition: "The time a packet spends waiting in intermediate router FIFO buffers before being scheduled and transmitted across the outgoing link.",
        context: "Oversized router queues produce 'Bufferbloat', ballooning queuing delay from 5ms to hundreds of ms without increasing throughput."
    },
    bdp: {
        title: "Bandwidth-Delay Product (BDP)",
        formula: "BDP = Bottleneck Bandwidth × Base RTT",
        definition: "The volume of data (in bits or packets) required to completely fill the network pipe end-to-end to achieve 100% link utilization.",
        context: "Example: 10 Mbps × 44ms RTT = 440,000 bits ≈ 37.6 packets (MSS 1460B). If cwnd < BDP, the bottleneck pipe is under-utilized."
    },
    drops: {
        title: "Dropped Packets (Loss Events)",
        formula: "P_loss = Dropped_Packets / Transmitted_Packets",
        definition: "Packets discarded en route. Caused by either router DropTail queue buffer overflow or physical channel noise/fading.",
        context: "In classic TCP (Tahoe, Reno), ANY dropped packet is assumed to signal network congestion, prompting an aggressive reduction in cwnd."
    },
    sim_speed: {
        title: "Simulation Speed Multiplier",
        formula: "Δt_scaled = Δt_real × Sim_Speed",
        definition: "Controls the temporal fidelity of the simulation. Set to 0.05x–0.25x for extreme slow-motion educational analysis.",
        context: "Ultra-slow speeds allow you to observe single-packet arrivals, buffer slot fills, and duplicate ACK generation one by one."
    },
    bandwidth: {
        title: "Bottleneck Capacity",
        formula: "C = DataRate (e.g. 10 Mbps = 10,000,000 bits/sec)",
        definition: "The narrowest transmission link along the end-to-end network path that bounds maximum achievable throughput.",
        context: "Packets arrive from the high-speed access link (100 Mbps) faster than the bottleneck can drain, forcing them into the router buffer."
    },
    delay: {
        title: "Propagation Delay (One-Way)",
        formula: "RTT_base ≈ 2 × (D_access + D_bottleneck)",
        definition: "The physical propagation latency for light/radio signals to traverse the transmission medium.",
        context: "High delays (e.g. 80ms Satellite links) produce 'Long Fat Networks' (LFNs), where Reno takes dozens of seconds to recover window size."
    },
    loss: {
        title: "Link Error Rate (Random Loss)",
        formula: "P(drop) = LossRate (e.g. 1% = 0.01 per packet)",
        definition: "Synthetic link-layer corruption modeling wireless interference, bit flips, or fading channels.",
        context: "Allows contrasting congestion loss (buffer full) with non-congestion random loss."
    },
    queue: {
        title: "Router Buffer Capacity",
        formula: "Max Buffer = Q_max packets (DropTail)",
        definition: "The physical RAM memory dedicated in the router interface queue to absorb packet bursts.",
        context: "When queue occupancy reaches Q_max, incoming packets are dropped immediately (DropTail)."
    }
};

