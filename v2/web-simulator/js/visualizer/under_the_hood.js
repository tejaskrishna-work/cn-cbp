/**
 * "Under-The-Hood" Inspector Panel Controller
 * Formats and renders educational deep-dives, mathematical formulas,
 * state machine diagrams, packet headers, and buffer mechanics.
 */

export class UnderTheHoodInspector {
    constructor(containerElement) {
        this.container = containerElement;
    }

    /**
     * Inspect a clicked target from the Canvas or Chart.
     */
    inspect(target, sim) {
        if (!target) return;

        if (target.type === 'node') {
            if (target.id === 'sender') {
                this.renderSenderInspector(sim);
            } else if (target.id === 'receiver') {
                this.renderReceiverInspector(sim);
            } else {
                this.renderRouterInspector(sim);
            }
        } else if (target.type === 'buffer') {
            this.renderBufferInspector(sim);
        } else if (target.type === 'packet') {
            this.renderPacketInspector(target.data, sim);
        } else if (target.cwnd !== undefined) {
            // Chart point clicked!
            this.renderChartPointInspector(target, sim);
        }
    }

    renderSenderInspector(sim) {
        const agent = sim.tcpAgent;
        const bdpPkts = (sim.params.bandwidthMbps * 1e6 / 8.0 * (agent.srtt || 0.044) / agent.mss).toFixed(1);
        const inFlight = ((sim.nextSeqNumber - sim.expectedAckNumber) / agent.mss).toFixed(1);

        const states = ['SLOW_START', 'CONGESTION_AVOIDANCE', 'FAST_RECOVERY', 'CUBIC_CONCAVE', 'CUBIC_CONVEX'];

        this.container.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge badge-sender">Sender Node (H1: 10.1.1.1)</span>
                    <h3>TCP Stack & State Machine: ${agent.variant}</h3>
                </div>
                <div class="uth-rfc">RFC Standard: ${this.getVariantRfc(agent.variant)}</div>
            </div>

            <div class="uth-section">
                <h4>1. Active Finite State Machine (FSM)</h4>
                <div class="fsm-container">
                    ${this.renderFsmDiagram(agent.state, agent.variant)}
                </div>
            </div>

            <div class="uth-section">
                <h4>2. Mathematical Formula In Action</h4>
                <div class="formula-box">
                    <div class="formula-equation">${agent.activeFormula}</div>
                    <div class="formula-reason"><strong>Event Logic:</strong> ${agent.lastEventReason}</div>
                </div>
            </div>

            <div class="uth-grid">
                <div class="uth-card">
                    <h4>Internal Variables</h4>
                    <table class="uth-table">
                        <tr><td>Congestion Window (cwnd)</td><td><strong>${agent.cwnd.toFixed(2)} MSS</strong> (${(agent.cwnd * agent.mss).toLocaleString()} B)</td></tr>
                        <tr><td>Slow Start Threshold (ssthresh)</td><td><strong>${agent.ssthresh.toFixed(2)} MSS</strong></td></tr>
                        <tr><td>Packets In-Flight</td><td><strong>${inFlight} MSS</strong></td></tr>
                        <tr><td>Dup ACK Counter</td><td><strong>${agent.dupAckCount} / 3</strong></td></tr>
                    </table>
                </div>

                <div class="uth-card">
                    <h4>RTT Estimator (RFC 6298)</h4>
                    <table class="uth-table">
                        <tr><td>Smoothed RTT (SRTT)</td><td><strong>${((agent.srtt || 0.044) * 1000).toFixed(1)} ms</strong></td></tr>
                        <tr><td>RTT Variance (RTTVAR)</td><td><strong>${((agent.rttvar || 0.01) * 1000).toFixed(1)} ms</strong></td></tr>
                        <tr><td>Retransmit Timeout (RTO)</td><td><strong>${(agent.rto || 1.0).toFixed(2)} s</strong></td></tr>
                        <tr><td>Bandwidth-Delay Product (BDP)</td><td><strong>~${bdpPkts} pkts</strong></td></tr>
                    </table>
                </div>
            </div>

            <div class="uth-section">
                <h4>3. TCP Sliding Window Representation</h4>
                <div class="sliding-window">
                    <div class="sw-bar">
                        <div class="sw-segment acked" style="width: 35%;">ACKed Data</div>
                        <div class="sw-segment inflight" style="width: 30%;">In Flight (${inFlight} pkts)</div>
                        <div class="sw-segment usable" style="width: 20%;">Usable cwnd</div>
                        <div class="sw-segment outside" style="width: 15%;">Cannot Send</div>
                    </div>
                    <div class="sw-legend">
                        <span><span class="dot acked"></span> Cumulative ACK: #${sim.expectedAckNumber}</span>
                        <span><span class="dot inflight"></span> Next Seq: #${sim.nextSeqNumber}</span>
                    </div>
                </div>
            </div>
        `;
    }

    renderBufferInspector(sim) {
        const buf = sim.buffer;
        const qDelay = buf.getQueuingDelayMs(sim.tcpAgent.mss).toFixed(2);
        const bdpPkts = (sim.params.bandwidthMbps * 1e6 / 8.0 * (sim.tcpAgent.srtt || 0.044) / sim.tcpAgent.mss).toFixed(1);

        this.container.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge badge-router">Bottleneck Router 1 (R0)</span>
                    <h3>Queue Buffer & DropTail Inspection</h3>
                </div>
                <div class="uth-rfc">FIFO / DropTail Queue</div>
            </div>

            <div class="uth-section">
                <h4>1. Live Queue Occupancy (${buf.getOccupancy()} / ${buf.maxPackets} Packets)</h4>
                <div class="buffer-visualizer">
                    ${this.renderBufferSlots(buf)}
                </div>
            </div>

            <div class="uth-grid">
                <div class="uth-card">
                    <h4>Queue Mechanics</h4>
                    <table class="uth-table">
                        <tr><td>Queue Fill Ratio</td><td><strong>${(buf.getFillRatio() * 100).toFixed(1)}%</strong></td></tr>
                        <tr><td>Current Queuing Delay</td><td><strong>${qDelay} ms</strong></td></tr>
                        <tr><td>Bandwidth-Delay Product (BDP)</td><td><strong>~${bdpPkts} packets</strong></td></tr>
                        <tr><td>Buffer Status</td><td><strong>${buf.getFillRatio() > 0.8 ? 'CONGESTED (Near Drop)' : 'HEALTHY'}</strong></td></tr>
                    </table>
                </div>

                <div class="uth-card">
                    <h4>Bufferbloat Analysis</h4>
                    <div class="educational-note">
                        <p><strong>Queuing Delay Equation:</strong></p>
                        <p class="math-snippet">D_queue = (Queue_Packets × MSS × 8) / Bottleneck_Bandwidth</p>
                        <p>When the buffer capacity (${buf.maxPackets} pkts) significantly exceeds the BDP (~${bdpPkts} pkts), packets queue up without increasing throughput, causing <em>Bufferbloat</em>.</p>
                    </div>
                </div>
            </div>

            <div class="uth-section">
                <h4>2. Dropped Packets History</h4>
                <div class="drop-log">
                    ${buf.droppedPackets.length === 0 ? '<p class="text-muted">No packets dropped yet. Network running smoothly!</p>' : 
                        buf.droppedPackets.slice(-5).reverse().map(d => `
                            <div class="drop-item">
                                <span class="badge badge-drop">DROP</span>
                                <span>Time: ${d.time.toFixed(3)}s</span>
                                <span>Seq #${d.seq}</span>
                                <span>Reason: ${d.reason}</span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    renderPacketInspector(pkt, sim) {
        const details = pkt.getDetails();

        this.container.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge ${pkt.type === 'ACK' ? 'badge-ack' : 'badge-data'}">${pkt.type} Segment</span>
                    <h3>Packet #${pkt.id} Header Inspection</h3>
                </div>
                <div class="uth-rfc">RFC 793 TCP Segment</div>
            </div>

            <div class="uth-section">
                <h4>1. Wireshark-Style TCP Header Fields</h4>
                <div class="packet-header-grid">
                    <div class="ph-field"><span class="ph-label">Source Port:</span> <span class="ph-val">${pkt.src}</span></div>
                    <div class="ph-field"><span class="ph-label">Destination Port:</span> <span class="ph-val">${pkt.dst}</span></div>
                    <div class="ph-field"><span class="ph-label">Sequence Number:</span> <span class="ph-val">#${pkt.seq}</span></div>
                    <div class="ph-field"><span class="ph-label">Acknowledgment Number:</span> <span class="ph-val">#${pkt.ack}</span></div>
                    <div class="ph-field"><span class="ph-label">Payload Size:</span> <span class="ph-val">${details.payloadBytes}</span></div>
                    <div class="ph-field"><span class="ph-label">TCP Flags:</span> <span class="ph-val">[${details.flags}]</span></div>
                    <div class="ph-field"><span class="ph-label">Transmit Timestamp:</span> <span class="ph-val">${details.sendTime}</span></div>
                    <div class="ph-field"><span class="ph-label">Status:</span> <span class="ph-val highlight-${pkt.isDropped ? 'red' : 'green'}">${details.status}</span></div>
                </div>
            </div>

            <div class="uth-section">
                <h4>2. Protocol Analysis & Meaning</h4>
                <div class="educational-note">
                    ${pkt.type === 'ACK' ? `
                        <p><strong>Cumulative ACK Semantics:</strong> This ACK confirms that all bytes up to <strong>#${pkt.ack - 1}</strong> have been successfully received and reassembled by the receiver.</p>
                        ${pkt.isDupAck ? `<p class="text-warning"><strong>Duplicate ACK Alert:</strong> This is Duplicate ACK #${pkt.dupCount}. The receiver is missing segment #${pkt.ack}. If 3 Duplicate ACKs arrive at the sender, Fast Retransmit will immediately trigger!</p>` : ''}
                    ` : `
                        <p><strong>Data Segment:</strong> Carrying MSS = ${pkt.size} bytes from the sender application. If lost or dropped due to buffer overflow, sender will detect the loss via either 3 Duplicate ACKs or an RTO timeout.</p>
                        ${pkt.isRetransmission ? `<p class="text-warning"><strong>Retransmission:</strong> Sent in response to loss detection.</p>` : ''}
                    `}
                </div>
            </div>
        `;
    }

    renderChartPointInspector(point, sim) {
        this.container.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge badge-chart">Graph Point: t = ${point.time}s</span>
                    <h3>Congestion Window Inflection Analysis</h3>
                </div>
                <div class="uth-rfc">State: ${point.state}</div>
            </div>

            <div class="uth-section">
                <h4>1. Window State at Timestamp</h4>
                <div class="uth-grid">
                    <div class="uth-card">
                        <div class="stat-highlight">
                            <span class="stat-num">${point.cwnd} MSS</span>
                            <span class="stat-label">Congestion Window (cwnd)</span>
                        </div>
                    </div>
                    <div class="uth-card">
                        <div class="stat-highlight">
                            <span class="stat-num">${point.ssthresh} MSS</span>
                            <span class="stat-label">Slow Start Threshold (ssthresh)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="uth-section">
                <h4>2. Mathematical Rule That Governed This Point</h4>
                <div class="formula-box">
                    <div class="formula-equation">${point.formula}</div>
                    <div class="formula-reason"><strong>Why this happened:</strong> ${point.reason}</div>
                </div>
            </div>

            <div class="uth-section">
                <h4>3. Algorithm Comparative Behavior Matrix</h4>
                <p>If another algorithm were running at this exact same loss/growth event:</p>
                <table class="uth-table compare-table">
                    <thead>
                        <tr><th>Algorithm</th><th>Reaction to this Event</th><th>State Result</th></tr>
                    </thead>
                    <tbody>
                        <tr class="${sim.params.variant === 'TcpTahoe' ? 'current-active' : ''}">
                            <td><strong>Tahoe</strong></td>
                            <td>Resets cwnd to 1 MSS immediately; severe throughput drop</td>
                            <td>Slow Start</td>
                        </tr>
                        <tr class="${sim.params.variant === 'TcpReno' || sim.params.variant === 'TcpLinuxReno' ? 'current-active' : ''}">
                            <td><strong>Reno</strong></td>
                            <td>Fast Recovery: cwnd = ssthresh + 3; skips slow start penalty</td>
                            <td>Fast Recovery</td>
                        </tr>
                        <tr class="${sim.params.variant === 'TcpNewReno' ? 'current-active' : ''}">
                            <td><strong>NewReno</strong></td>
                            <td>Partial ACK handling: Recovers multiple drops per window without RTO</td>
                            <td>Fast Recovery</td>
                        </tr>
                        <tr class="${sim.params.variant === 'TcpCubic' ? 'current-active' : ''}">
                            <td><strong>Cubic</strong></td>
                            <td>W_cubic(t) = C(t-K)³ + W_max; rapid cubic concave/convex recovery</td>
                            <td>Cubic Autonomous</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    renderReceiverInspector(sim) {
        this.container.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge badge-receiver">Receiver Node (H2: 10.1.3.1)</span>
                    <h3>Receiver TCP Sink & ACK Generator</h3>
                </div>
                <div class="uth-rfc">RFC 793 / RFC 1122</div>
            </div>

            <div class="uth-section">
                <h4>Receiver Reassembly State</h4>
                <table class="uth-table">
                    <tr><td>Cumulative Acknowledged Seq</td><td><strong>#${sim.expectedAckNumber}</strong></td></tr>
                    <tr><td>Advertised Window (rwnd)</td><td><strong>65,535 Bytes</strong> (Not flow-control limited)</td></tr>
                    <tr><td>Out-of-Order Buffer Gap</td><td><strong>${sim.receivedOutOfOrder.size} unmerged segments</strong></td></tr>
                    <tr><td>ACK Generation Logic</td><td>Generates immediate Dup ACK upon detecting seq gap; cumulative ACK on in-order receipt.</td></tr>
                </table>
            </div>
        `;
    }

    renderRouterInspector(sim) {
        this.renderBufferInspector(sim);
    }

    renderBufferSlots(buf) {
        const slots = [];
        const occ = buf.getOccupancy();
        const total = Math.min(50, buf.maxPackets);

        for (let i = 0; i < total; i++) {
            const isFilled = i < occ;
            slots.push(`<div class="buf-slot ${isFilled ? 'filled' : 'empty'}"></div>`);
        }
        return slots.join('');
    }

    renderFsmDiagram(activeState, variant) {
        const states = [
            { id: 'SLOW_START', label: 'Slow Start\n(Exponential)' },
            { id: 'CONGESTION_AVOIDANCE', label: 'Congestion Avoidance\n(Linear AIMD)' },
            { id: 'FAST_RECOVERY', label: 'Fast Recovery\n(Window Halved)' },
            { id: 'CUBIC_CONCAVE', label: 'Cubic Concave\n(Aggressive Recovery)' },
            { id: 'CUBIC_CONVEX', label: 'Cubic Convex\n(Capacity Probing)' }
        ];

        return `
            <div class="fsm-flex">
                ${states.map(s => `
                    <div class="fsm-node ${activeState === s.id ? 'active-fsm' : ''}">
                        <div class="fsm-label">${s.label.replace('\n', '<br>')}</div>
                        ${activeState === s.id ? '<div class="fsm-pulse">ACTIVE</div>' : ''}
                    </div>
                `).join('<div class="fsm-arrow">➔</div>')}
            </div>
        `;
    }

    getVariantRfc(variant) {
        switch (variant) {
            case 'TcpTahoe': return 'RFC 2001 (Slow Start / Congestion Avoidance)';
            case 'TcpReno':
            case 'TcpLinuxReno': return 'RFC 5681 (TCP Congestion Control - Fast Recovery)';
            case 'TcpNewReno': return 'RFC 6582 (NewReno Partial ACK Handling)';
            case 'TcpCubic': return 'RFC 8312 (CUBIC for Fast and Long-Distance Networks)';
            default: return 'RFC 793 (Transmission Control Protocol)';
        }
    }
}

