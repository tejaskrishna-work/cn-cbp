/**
 * Discrete-Event Network Simulator
 * Simulates end-to-end packet transmission over a Dumbbell Topology:
 * [Sender] ----(Access)----> [Router 1] ====(Bottleneck Buffer)====> [Router 2] ----(Access)----> [Receiver]
 */
import { Packet } from './packet.js';
import { RouterBuffer } from './buffer.js';
import { createTcpAgent } from './tcp_agents.js';

export class NetworkSimulator {
    constructor() {
        // Network Parameters
        this.params = {
            variant: 'TcpCubic',
            bandwidthMbps: 10.0,
            propagationDelayMs: 20.0,
            packetLossRate: 0.01, // 1%
            queueCapacity: 50,
            accessBandwidthMbps: 100.0,
            accessDelayMs: 2.0,
            simSpeed: 1.0 // 0.25x to 5x
        };

        // Network Components
        this.tcpAgent = createTcpAgent(this.params.variant);
        this.buffer = new RouterBuffer(this.params.queueCapacity, this.params.bandwidthMbps);

        // Simulation State
        this.currentTime = 0.0;
        this.isRunning = false;
        this.packetIdCounter = 1;
        this.nextSeqNumber = 1;
        this.expectedAckNumber = 1;
        this.receiverMaxAck = 1;
        this.receivedOutOfOrder = new Set();

        // In-flight packets and ACKs
        this.packetsInFlight = [];
        this.acksInFlight = [];

        // RTT and Timing
        this.sentTimestamps = new Map(); // seq -> sendTime

        // Time Series History for Graphs and Inspector
        this.history = {
            cwnd: [],
            queue: [],
            throughput: [],
            events: []
        };

        // Performance Statistics
        this.stats = {
            totalSentBytes: 0,
            totalAckedBytes: 0,
            totalDroppedPackets: 0,
            retransmittedPackets: 0,
            currentThroughputMbps: 0.0,
            avgThroughputMbps: 0.0
        };

        this.lastThroughputCalcTime = 0.0;
        this.bytesSinceLastThroughput = 0;

        // Callbacks
        this.onTick = null;
        this.onEvent = null;
    }

    setVariant(variantName) {
        this.params.variant = variantName;
        const oldCwnd = this.tcpAgent.cwnd;
        const oldSsthresh = this.tcpAgent.ssthresh;
        this.tcpAgent = createTcpAgent(variantName);
        this.tcpAgent.cwnd = Math.min(oldCwnd, 32);
        this.tcpAgent.ssthresh = oldSsthresh;
        this.logEvent(`Switched TCP Algorithm to ${variantName}`);
    }

    updateParams(newParams) {
        Object.assign(this.params, newParams);
        this.buffer.setCapacity(this.params.queueCapacity);
        this.buffer.setBandwidth(this.params.bandwidthMbps);
    }

    reset() {
        this.currentTime = 0.0;
        this.isRunning = false;
        this.packetIdCounter = 1;
        this.nextSeqNumber = 1;
        this.expectedAckNumber = 1;
        this.receiverMaxAck = 1;
        this.receivedOutOfOrder.clear();
        this.packetsInFlight = [];
        this.acksInFlight = [];
        this.sentTimestamps.clear();
        this.buffer.clear();
        this.tcpAgent.reset();

        this.history = {
            cwnd: [],
            queue: [],
            throughput: [],
            events: []
        };

        this.stats = {
            totalSentBytes: 0,
            totalAckedBytes: 0,
            totalDroppedPackets: 0,
            retransmittedPackets: 0,
            currentThroughputMbps: 0.0,
            avgThroughputMbps: 0.0
        };

        this.lastThroughputCalcTime = 0.0;
        this.bytesSinceLastThroughput = 0;

        this.recordMetrics();
    }

    logEvent(description, type = 'INFO') {
        const entry = {
            time: this.currentTime,
            type,
            description
        };
        this.history.events.push(entry);
        if (this.onEvent) this.onEvent(entry);
    }

    /**
     * Attempts to send packets if cwnd allows it.
     */
    trySendPackets() {
        const maxInFlightPackets = Math.max(1, Math.floor(this.tcpAgent.cwnd));
        const currentInFlight = this.packetsInFlight.length;

        while (currentInFlight + (this.nextSeqNumber - this.expectedAckNumber) / this.tcpAgent.mss < maxInFlightPackets) {
            const seq = this.nextSeqNumber;
            const isRetransmit = this.sentTimestamps.has(seq);

            const packet = new Packet({
                id: this.packetIdCounter++,
                seq: seq,
                size: this.tcpAgent.mss,
                type: 'DATA',
                flags: ['ACK', 'PSH'],
                src: '10.1.1.1:49152',
                dst: '10.1.3.1:9000',
                sendTime: this.currentTime,
                isRetransmission: isRetransmit
            });

            this.sentTimestamps.set(seq, this.currentTime);
            this.tcpAgent.highestSentSeq = Math.max(this.tcpAgent.highestSentSeq, seq);
            this.packetsInFlight.push(packet);
            this.stats.totalSentBytes += packet.size;

            if (isRetransmit) {
                this.stats.retransmittedPackets++;
            }

            this.nextSeqNumber += this.tcpAgent.mss;
        }
    }

    /**
     * Advances simulation by deltaTime (in seconds).
     */
    step(dt) {
        if (dt <= 0) return;
        const scaledDt = dt * this.params.simSpeed;
        this.currentTime += scaledDt;

        // Calculate dynamic delays
        const accessDelaySec = this.params.accessDelayMs / 1000.0;
        const bottleneckDelaySec = this.params.propagationDelayMs / 1000.0;
        const queuingDelaySec = this.buffer.getQueuingDelayMs(this.tcpAgent.mss) / 1000.0;
        const totalOneWayDelay = accessDelaySec * 2 + bottleneckDelaySec + queuingDelaySec;

        // 1. Progress in-flight DATA packets towards receiver
        const remainingDataPackets = [];
        for (const pkt of this.packetsInFlight) {
            // Speed along path
            pkt.progress += scaledDt / Math.max(0.01, totalOneWayDelay);

            // Access Tx Segment (0.0 to 0.3)
            if (pkt.progress < 0.3) {
                pkt.pathSegment = 'ACCESS_TX';
            }
            // Queue & Bottleneck Segment (0.3 to 0.7)
            else if (pkt.progress >= 0.3 && pkt.progress < 0.7) {
                if (pkt.pathSegment === 'ACCESS_TX') {
                    // Arriving at Router 1 Queue
                    pkt.pathSegment = 'QUEUE';
                    const enqueued = this.buffer.enqueue(pkt, this.currentTime);
                    if (!enqueued) {
                        this.stats.totalDroppedPackets++;
                        this.logEvent(`DropTail: Packet Seq #${pkt.seq} dropped (Queue full)`, 'DROP');
                        // Packet dropped, do not advance to receiver
                        continue;
                    }

                    // Check for random link loss on bottleneck
                    if (Math.random() < this.params.packetLossRate) {
                        pkt.isDropped = true;
                        pkt.dropReason = 'RANDOM_CHANNEL_LOSS';
                        this.stats.totalDroppedPackets++;
                        this.buffer.dequeue(); // leaves queue but lost on link
                        this.logEvent(`Channel Error: Packet Seq #${pkt.seq} corrupted on bottleneck link`, 'DROP');
                        continue;
                    }
                }
                pkt.pathSegment = 'BOTTLENECK';
            }
            // Access Rx Segment (0.7 to 1.0)
            else if (pkt.progress >= 0.7 && pkt.progress < 1.0) {
                if (pkt.pathSegment === 'BOTTLENECK') {
                    this.buffer.dequeue();
                }
                pkt.pathSegment = 'ACCESS_RX';
            }
            // Packet Reached Receiver!
            else if (pkt.progress >= 1.0) {
                this.onPacketArriveReceiver(pkt);
                continue; // Delivered, remove from in-flight data
            }

            remainingDataPackets.push(pkt);
        }
        this.packetsInFlight = remainingDataPackets;

        // 2. Progress in-flight ACKs back to sender
        const remainingAcks = [];
        const ackReturnDelay = accessDelaySec * 2 + bottleneckDelaySec;
        for (const ack of this.acksInFlight) {
            ack.progress += scaledDt / Math.max(0.01, ackReturnDelay);

            if (ack.progress >= 1.0) {
                this.onAckArriveSender(ack);
                continue; // Delivered to sender
            }
            remainingAcks.push(ack);
        }
        this.acksInFlight = remainingAcks;

        // 3. Sender checks for Retransmission Timeout (RTO)
        this.checkRtoTimeouts();

        // 4. Try sending new packets based on updated cwnd
        this.trySendPackets();

        // 5. Periodic throughput & metric history recording
        if (this.currentTime - this.lastThroughputCalcTime >= 0.1) {
            const intervalSec = this.currentTime - this.lastThroughputCalcTime;
            this.stats.currentThroughputMbps = (this.bytesSinceLastThroughput * 8.0) / (intervalSec * 1e6);
            this.bytesSinceLastThroughput = 0;
            this.lastThroughputCalcTime = this.currentTime;

            // Rolling average throughput
            this.stats.avgThroughputMbps = (this.stats.totalAckedBytes * 8.0) / (this.currentTime * 1e6);

            this.recordMetrics();
        }

        if (this.onTick) this.onTick(this);
    }

    onPacketArriveReceiver(pkt) {
        let isDupAck = false;
        let ackNumber = this.receiverMaxAck;

        if (pkt.seq === this.receiverMaxAck) {
            // In-order packet arrival
            this.receiverMaxAck += pkt.size;

            // Check if buffered out-of-order packets can now be cumulatively acknowledged
            while (this.receivedOutOfOrder.has(this.receiverMaxAck)) {
                this.receivedOutOfOrder.delete(this.receiverMaxAck);
                this.receiverMaxAck += pkt.size;
            }
            ackNumber = this.receiverMaxAck;
            isDupAck = false;
        } else if (pkt.seq > this.receiverMaxAck) {
            // Out of order packet arrival! Gap detected.
            this.receivedOutOfOrder.add(pkt.seq);
            ackNumber = this.receiverMaxAck; // Duplicate ACK requesting the missing byte!
            isDupAck = true;
        } else {
            // Already received sequence
            ackNumber = this.receiverMaxAck;
            isDupAck = true;
        }

        // Generate ACK packet traveling back to sender
        const ackPacket = new Packet({
            id: this.packetIdCounter++,
            seq: 0,
            ack: ackNumber,
            size: 40, // pure ACK header
            type: 'ACK',
            flags: ['ACK'],
            src: '10.1.3.1:9000',
            dst: '10.1.1.1:49152',
            sendTime: this.currentTime,
            isDupAck: isDupAck,
            dupCount: isDupAck ? this.tcpAgent.dupAckCount + 1 : 0
        });

        this.acksInFlight.push(ackPacket);
    }

    onAckArriveSender(ack) {
        const isDup = ack.isDupAck;
        const ackSeq = ack.ack;

        // Measure sample RTT if original packet timestamp exists
        if (!isDup && this.sentTimestamps.has(ackSeq - this.tcpAgent.mss)) {
            const sentAt = this.sentTimestamps.get(ackSeq - this.tcpAgent.mss);
            const sampleRtt = this.currentTime - sentAt;
            this.tcpAgent.updateRtt(sampleRtt);
        }

        const action = this.tcpAgent.onAck(ackSeq, isDup, this.currentTime);

        if (!isDup) {
            const newlyAckedBytes = Math.max(0, ackSeq - this.expectedAckNumber);
            this.stats.totalAckedBytes += newlyAckedBytes;
            this.bytesSinceLastThroughput += newlyAckedBytes;
            this.expectedAckNumber = ackSeq;
        }

        if (action.retransmitNeeded) {
            this.retransmitPacket(this.expectedAckNumber, action.trigger);
        }
    }

    retransmitPacket(seq, trigger) {
        this.logEvent(`Retransmitting packet Seq #${seq} (${trigger})`, 'RETRANSMIT');
        const packet = new Packet({
            id: this.packetIdCounter++,
            seq: seq,
            size: this.tcpAgent.mss,
            type: 'DATA',
            flags: ['ACK', 'PSH'],
            src: '10.1.1.1:49152',
            dst: '10.1.3.1:9000',
            sendTime: this.currentTime,
            isRetransmission: true
        });

        this.sentTimestamps.set(seq, this.currentTime);
        this.packetsInFlight.push(packet);
        this.stats.totalSentBytes += packet.size;
        this.stats.retransmittedPackets++;
    }

    checkRtoTimeouts() {
        if (this.sentTimestamps.has(this.expectedAckNumber)) {
            const sentTime = this.sentTimestamps.get(this.expectedAckNumber);
            if (this.currentTime - sentTime > this.tcpAgent.rto) {
                // RTO expired!
                this.tcpAgent.onTimeout(this.currentTime);
                this.logEvent(`RTO Expired for Seq #${this.expectedAckNumber} (${this.tcpAgent.rto.toFixed(2)}s). cwnd reset to 1.`, 'TIMEOUT');
                this.retransmitPacket(this.expectedAckNumber, 'TIMEOUT');
            }
        }
    }

    recordMetrics() {
        this.history.cwnd.push({
            time: parseFloat(this.currentTime.toFixed(3)),
            cwnd: parseFloat(this.tcpAgent.cwnd.toFixed(2)),
            ssthresh: parseFloat(this.tcpAgent.ssthresh.toFixed(2)),
            state: this.tcpAgent.state,
            formula: this.tcpAgent.activeFormula,
            reason: this.tcpAgent.lastEventReason
        });

        this.history.queue.push({
            time: parseFloat(this.currentTime.toFixed(3)),
            queueSize: this.buffer.getOccupancy(),
            maxQueue: this.params.queueCapacity
        });

        this.history.throughput.push({
            time: parseFloat(this.currentTime.toFixed(3)),
            throughput: parseFloat(this.stats.currentThroughputMbps.toFixed(2))
        });

        // Limit history to 600 points for smooth charting
        if (this.history.cwnd.length > 600) {
            this.history.cwnd.shift();
            this.history.queue.shift();
            this.history.throughput.shift();
        }
    }
}

