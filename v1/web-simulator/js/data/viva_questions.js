/**
 * Interactive Viva Examination & Computer Networks Quiz Questions
 * Used for instructor evaluation and student oral exam prep.
 */

export const VIVA_QUESTIONS = [
    {
        id: 1,
        question: "Why does TCP Reno wait for 3 Duplicate ACKs before triggering Fast Retransmit instead of reacting on the 1st duplicate ACK?",
        options: [
            "To allow network buffers to completely drain before retransmitting.",
            "Because IP networks can deliver packets out-of-order; 1 or 2 Dup ACKs might just be harmless packet reordering, whereas 3 Dup ACKs is a strong consensus that a packet was truly dropped.",
            "Because 3 duplicate ACKs equal exactly 1 MSS of data.",
            "To give the receiver time to enlarge its advertised flow control window (rwnd)."
        ],
        correct: 1,
        explanation: "RFC 5681 specifies that out-of-order packet delivery over multipath networks frequently causes 1 or 2 duplicate ACKs. Waiting for the 3rd duplicate ACK provides a high-confidence heuristic separating minor packet reordering from genuine packet loss."
    },
    {
        id: 2,
        question: "What is the fundamental mathematical equation governing TCP Cubic's congestion window growth?",
        options: [
            "W(t) = W_old + 1/W_old (Linear AIMD)",
            "W(t) = C(t - K)³ + W_max (Cubic polynomial of elapsed time t since last loss)",
            "W(t) = 2^t (Exponential doubling)",
            "W(t) = BDP × RTT"
        ],
        correct: 1,
        explanation: "RFC 8312 defines Cubic's window as a cubic function of time t elapsed since the last loss event: W_cubic(t) = C(t - K)³ + W_max. This makes its window growth independent of RTT, allowing it to rapidly utilize high-BDP Long Fat Networks."
    },
    {
        id: 3,
        question: "If Bottleneck Bandwidth is 10 Mbps and base RTT is 44 ms, what is the approximate Bandwidth-Delay Product (BDP) in packets (MSS = 1460 Bytes)?",
        options: [
            "Approximately 12 packets",
            "Approximately 38 packets",
            "Approximately 150 packets",
            "Approximately 500 packets"
        ],
        correct: 1,
        explanation: "BDP = (10 × 10^6 bits/sec) × 0.044 sec = 440,000 bits. In bytes: 440,000 / 8 = 55,000 Bytes. In packets: 55,000 / 1460 ≈ 37.6 packets (≈ 38 packets)."
    },
    {
        id: 4,
        question: "What is the key performance drawback of TCP Tahoe compared to TCP Reno?",
        options: [
            "Tahoe causes bufferbloat by never reducing its window size.",
            "Tahoe lacks Fast Recovery; on any loss (even single isolated drop), it slashes cwnd all the way down to 1 MSS, forcing a slow start rebuild.",
            "Tahoe cannot calculate RTT variance.",
            "Tahoe only works on local area networks (LANs)."
        ],
        correct: 1,
        explanation: "TCP Tahoe (1988) resets cwnd = 1 MSS on 3 duplicate ACKs. TCP Reno (1990) introduced Fast Recovery, halving cwnd (ssthresh = cwnd/2) and skipping Slow Start, preserving link utilization."
    },
    {
        id: 5,
        question: "How does TCP NewReno (RFC 6582) solve Reno's weakness when multiple packets are lost in the same window?",
        options: [
            "It switches to UDP protocol automatically.",
            "It uses 'Partial ACKs' to infer that another packet was lost in the same window, immediately retransmitting the next missing segment without exiting Fast Recovery or waiting for RTO.",
            "It doubles the congestion window size.",
            "It relies on router ECN markings rather than packet drops."
        ],
        correct: 1,
        explanation: "When multiple packets drop in one window, Reno exits Fast Recovery on the first ACK and suffers an expensive RTO timeout on the second lost segment. NewReno treats Partial ACKs as a signal that more packets were lost and continues retransmitting without waiting for timeout."
    },
    {
        id: 6,
        question: "What is 'Bufferbloat' and why does having an oversized router buffer harm network performance?",
        options: [
            "It causes routers to run out of RAM and crash.",
            "It increases queuing delay exponentially without providing any additional throughput, severely degrading interactive applications like VoIP, DNS, and online gaming.",
            "It reduces the bandwidth of the physical cable.",
            "It forces all packets to be fragmented into smaller MSS sizes."
        ],
        correct: 1,
        explanation: "Throughput is limited by the bottleneck link transmission speed. Once the buffer holds 1 BDP worth of packets, any extra buffer capacity only accumulates queued packets, ballooning queuing delay (D_queue = Q / C) from milliseconds to seconds without any throughput improvement."
    }
];

