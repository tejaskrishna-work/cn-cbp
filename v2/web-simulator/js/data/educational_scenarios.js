/**
 * Pre-Configured Educational Scenarios & Guided Walkthroughs
 * Each scenario configures the simulator to demonstrate a core computer networking concept.
 */

export const EDUCATIONAL_SCENARIOS = [
    {
        id: 'fast_retransmit',
        title: '1. The 3 Duplicate ACK Phenomenon',
        subtitle: 'Why 3 Dup ACKs trigger Fast Retransmit without waiting for RTO',
        description: 'Watch how packet loss causes sequence gaps at the receiver. The receiver issues duplicate ACKs. Upon the 3rd duplicate ACK, the sender triggers Fast Retransmit and enters Fast Recovery instead of waiting for a slow timeout.',
        config: {
            variant: 'TcpReno',
            bandwidthMbps: 10.0,
            propagationDelayMs: 20.0,
            packetLossRate: 0.02,
            queueCapacity: 40,
            simSpeed: 0.5 // Slow-mo for visual tracking
        },
        learningPoints: [
            '1st & 2nd Duplicate ACKs could be harmless packet re-ordering over parallel paths.',
            '3rd Duplicate ACK is standard TCP consensus (RFC 5681) that a segment was truly lost.',
            'Fast Retransmit sends the missing packet immediately, skipping the expensive RTO timeout timer.',
            'In Reno, cwnd is halved (ssthresh = cwnd/2) and inflated to ssthresh + 3 MSS.'
        ]
    },
    {
        id: 'bufferbloat',
        title: '2. Bufferbloat & The Latency Trap',
        subtitle: 'How oversized router queues destroy interactive latency',
        description: 'Observe what happens when router buffer size is increased to 100 packets while bottleneck bandwidth is small. TCP fills the buffer to the brim, causing queue delay to skyrocket to hundreds of milliseconds without increasing throughput!',
        config: {
            variant: 'TcpCubic',
            bandwidthMbps: 5.0,
            propagationDelayMs: 15.0,
            packetLossRate: 0.001,
            queueCapacity: 90,
            simSpeed: 1.0
        },
        learningPoints: [
            'Bandwidth-Delay Product (BDP) represents the pipe capacity: BDP = Bandwidth × RTT.',
            'Buffer beyond 1× BDP only accumulates packets and adds delay (Queuing Delay = Q / Bandwidth).',
            'Notice the queue graph staying at 80-90% full — this is classic Bufferbloat.',
            'Modern algorithms like BBR and CoDel/FQ_CoDel were invented specifically to eliminate this problem.'
        ]
    },
    {
        id: 'satellite_lfn',
        title: '3. Long Fat Network (LFN) / High-RTT Satellite Link',
        subtitle: 'Why Cubic dominates standard Reno on high-delay links',
        description: 'On a satellite link with 100ms delay, classic Reno recovers agonizingly slowly after packet loss because AIMD increases cwnd by only 1 MSS per RTT. TCP Cubic uses an autonomous cubic function of time (W_cubic = C(t - K)³ + W_max), restoring high throughput quickly.',
        config: {
            variant: 'TcpCubic',
            bandwidthMbps: 20.0,
            propagationDelayMs: 80.0, // High RTT (~160ms)
            packetLossRate: 0.01,
            queueCapacity: 50,
            simSpeed: 1.5
        },
        learningPoints: [
            'On high-RTT links (LFNs), standard AIMD Reno takes tens of seconds to recover window size.',
            'CUBIC window growth is governed by time elapsed since last loss, not RTT!',
            'Notice Cubic entering the concave region, plateauing at W_max, and then convexly probing for extra capacity.'
        ]
    },
    {
        id: 'tahoe_vs_reno',
        title: '4. Tahoe vs Reno: The Penalty of Dropping to 1',
        subtitle: 'Comparing classic Tahoe (1988) with modern Fast Recovery',
        description: 'See the historical evolution: TCP Tahoe dropped cwnd all the way to 1 MSS on every loss, forcing a slow start rebuild. TCP Reno introduces Fast Recovery to preserve the packet clock.',
        config: {
            variant: 'TcpTahoe',
            bandwidthMbps: 10.0,
            propagationDelayMs: 20.0,
            packetLossRate: 0.015,
            queueCapacity: 40,
            simSpeed: 0.75
        },
        learningPoints: [
            'Tahoe: Severe sawtooth dips down to cwnd = 1 on every loss.',
            'Under identical loss conditions, Tahoe loses 30-40% goodput compared to Reno and Cubic.',
            'Switch between Tahoe and Reno using the selector to witness the goodput difference immediately!'
        ]
    }
];

