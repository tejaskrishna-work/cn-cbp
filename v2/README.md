# TCP Congestion Control Evaluation & Under-The-Hood Simulator
### Computer Networks Course-Based Project (CBP)
**Algorithms Benchmarked**: TCP Tahoe (RFC 2001), TCP Reno (RFC 5681), TCP NewReno (RFC 6582), TCP Cubic (RFC 8312)

---

## Quick Start (1-Click Launch)

To run the **Interactive Web Simulator & Inspector** immediately in your web browser:
```bash
python launch_dashboard.py
```
*Alternatively, you can navigate into `web-simulator/` and directly double-click `index.html` in your file explorer!*

---

## Project Structure

```
d:\tejas files\junk\code test\cn cbp\
├── launch_dashboard.py                 # One-click launcher (starts local server & opens browser)
│
├── ns3-simulations/                    # Production NS-3 C++ Simulation Suite
│   ├── tcp-variants-dumbbell.cc        # C++ simulation script with PointToPoint & FlowMonitor
│   ├── run_experiments.py             # Automation runner for parameter sweeps
│   ├── README.md                      # Compilation & execution guide for NS-3
│   └── sample_traces/                 # Pre-generated benchmark datasets (Tahoe, Reno, NewReno, Cubic)
│
├── web-simulator/                     # Interactive Educational & Applicative Web Dashboard
│   ├── index.html                     # Responsive single-page application
│   ├── css/
│   │   └── style.css                  # Dark-mode styling
│   └── js/
│       ├── app.js                     # Main coordinator
│       ├── engine/
│       │   ├── simulator.js           # Discrete-event network simulation engine
│       │   ├── packet.js              # TCP segment data structure & header fields
│       │   ├── buffer.js              # FIFO queue buffer with DropTail & queuing delay
│       │   └── tcp_agents.js          # Finite State Machines for Tahoe, Reno, NewReno, Cubic
│       ├── visualizer/
│       │   ├── topology_canvas.js     # Canvas renderer with animated packets & hit-testing
│       │   ├── chart_renderer.js      # Interactive CWND, Throughput & Queue size charts
│       │   └── under_the_hood.js      # Click-to-inspect modal & mathematical formula drawer
│       └── data/
│           ├── educational_scenarios.js # 4 guided educational lessons
│           └── ns3_trace_loader.js     # Parser to import & replay custom NS-3 trace files
│
└── docs/
    ├── project_report.md              # Academic-grade project report (with Viva Q&A)
    └── architecture_diagram.svg       # Dumbbell topology vector graphic
```

---

## Key Features

### 1. Interactive "Under-The-Hood" Inspection
- **Click the Sender (H1)**: Opens the live TCP Finite State Machine (`SLOW_START`, `CONGESTION_AVOIDANCE`, `FAST_RECOVERY`, `CUBIC_CONCAVE`, `CUBIC_CONVEX`), sliding window gauge, and RTT estimators ($SRTT$, $RTTVAR$, $RTO$).
- **Click the Bottleneck Router / Buffer**: Visualizes live FIFO packet slots, queuing delay formula ($D_{\text{queue}} = \frac{Q \times \text{MSS} \times 8}{\text{Bandwidth}}$), and drop history.
- **Click any In-Flight Packet**: Inspects Wireshark-style TCP headers (Source/Dest Port, Seq #, ACK #, Flags `[ACK, PSH]`, Payload size, and duplicate ACK counter).
- **Click any Point on the CWND Graph**: Freezes the simulation at that exact timestamp and explains the exact mathematical rule and RFC event that caused the window to grow or drop.

### 2. Guided Educational Missions
- **Mission 1**: *The 3 Duplicate ACK Phenomenon* (Demonstrates Fast Retransmit without waiting for RTO timeout).
- **Mission 2**: *Bufferbloat & The Latency Trap* (Shows how oversized queues increase latency by 10x without increasing throughput).
- **Mission 3**: *Satellite Link / Long Fat Network (LFN)* (Proves why Cubic's cubic equation recovers 2.5x faster than Reno on high-delay links).
- **Mission 4**: *Tahoe vs Reno* (Visualizes the goodput penalty of Tahoe dropping $cwnd$ to 1).

### 3. NS-3 Simulation Integration
- Authentic C++ code in `ns3-simulations/tcp-variants-dumbbell.cc` compatible with NS-3.35+.
- Generates `.pcap`, `cwnd.data`, `throughput.data`, and `queue.data`.
- Custom trace files can be directly uploaded into the web dashboard via the **"Import NS-3 Trace"** button.

---

## Evaluation Summary

| Algorithm | Average Goodput (10Mbps, 20ms, 1% Loss) | Link Utilization | Recovery Behavior |
| :--- | :---: | :---: | :--- |
| **TCP Tahoe** | 5.82 Mbps | 58.2% | Drops $cwnd \to 1\text{ MSS}$, Slow Start |
| **TCP Reno** | 7.94 Mbps | 79.4% | Fast Recovery ($cwnd \to ssthresh + 3$) |
| **TCP NewReno** | 8.35 Mbps | 83.5% | Partial ACK recovery (Handles multiple drops per window) |
| **TCP Cubic** | **9.42 Mbps** | **94.2%** | Autonomous cubic function ($W_{\text{cubic}} = C(t-K)^3 + W_{\max}$) |

