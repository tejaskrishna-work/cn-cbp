# NS-3 TCP Congestion Control Simulation Suite

This directory contains the NS-3 simulation scripts to evaluate and benchmark **TCP Tahoe**, **TCP Reno**, **TCP NewReno**, and **TCP Cubic** over a bottleneck dumbbell network topology.

## Prerequisites

- **NS-3** (version 3.35 or higher recommended; compatible with NS-3.36, 3.37, 3.38, 3.39, 3.40, 3.41+)
- C++17 compiler (GCC 9+ or Clang 10+)
- Python 3.8+ (for automation and trace processing)

---

## Network Topology: Bottleneck Dumbbell

```
[ Sender (n0) ]
      │ (Access Link: 100 Mbps, 2 ms)
      ▼
[ Router 1 (r0) ]
      │
      │ ◄── BOTTLENECK LINK (10 Mbps, 20 ms delay, DropTail Queue, Packet Error Model)
      ▼
[ Router 2 (r1) ]
      │ (Access Link: 100 Mbps, 2 ms)
      ▼
[ Receiver (n1) ]
```

- **Base Bandwidth-Delay Product (BDP)**:
  $$\text{BDP} = \frac{10\text{ Mbps} \times 44\text{ ms}}{8 \times 1460\text{ bytes/pkt}} \approx 37.6\text{ packets}$$
- **Bottleneck Queue Capacity**: 50 packets (DropTail)
- **MSS**: 1460 Bytes

---

## Running in NS-3

### 1. Copy Script to NS-3 Scratch Directory
```bash
cp tcp-variants-dumbbell.cc <ns3-root-directory>/scratch/
```

### 2. Compile and Run
Run with default parameters (TcpCubic, 10Mbps, 20ms delay, 0.1% loss):
```bash
./ns3 run "scratch/tcp-variants-dumbbell"
```

### 3. Run Specific Variants & Parameters
```bash
# TCP Tahoe
./ns3 run "scratch/tcp-variants-dumbbell --transportProt=TcpTahoe --packetLossRate=0.01 --simTime=30"

# TCP Reno
./ns3 run "scratch/tcp-variants-dumbbell --transportProt=TcpLinuxReno --packetLossRate=0.01 --simTime=30"

# TCP NewReno
./ns3 run "scratch/tcp-variants-dumbbell --transportProt=TcpNewReno --packetLossRate=0.01 --simTime=30"

# TCP Cubic
./ns3 run "scratch/tcp-variants-dumbbell --transportProt=TcpCubic --packetLossRate=0.01 --simTime=30"
```

### 4. Available Parameters
| Flag | Description | Default |
| :--- | :--- | :--- |
| `--transportProt` | TCP Variant (`TcpTahoe`, `TcpLinuxReno`, `TcpNewReno`, `TcpCubic`) | `TcpCubic` |
| `--bottleneckBandwidth` | Bottleneck link transmission speed | `10Mbps` |
| `--bottleneckDelay` | Propagation delay of bottleneck link | `20ms` |
| `--queueSize` | Max packets in router FIFO queue | `50` |
| `--packetLossRate` | Link error rate ($0.001 = 0.1\%$) | `0.001` |
| `--simTime` | Duration in simulated seconds | `20.0` |
| `--enablePcap` | Export Wireshark `.pcap` files | `false` |

---

## Output Traces

The simulation generates tabular trace files:
1. `*_cwnd.data`: `Time(s) \t OldCwnd \t NewCwnd`
2. `*_rtt.data`: `Time(s) \t OldRtt(ms) \t NewRtt(ms)`
3. `*_queue.data`: `Time(s) \t QueueSize(pkts)`
4. `*_drops.data`: `Time(s) \t PacketBytes \t DropReason`
5. `*_throughput.data`: `Time(s) \t Throughput(Mbps)`

These trace files can be directly loaded into the **Interactive Web Simulator** via the **Import NS-3 Trace** button.

---

## Automated Experiment Runner

To automatically simulate all 4 algorithms over various loss rates and convert them to web-ready JSON format:
```bash
python run_experiments.py
```
Outputs are saved into `sample_traces/`.

