/**
 * TCP Congestion Control Algorithms
 * Implements: Tahoe (RFC 2001), Reno (RFC 5681), NewReno (RFC 6582), Cubic (RFC 8312)
 */

export class BaseTcpAgent {
    constructor(variantName = 'BaseTCP') {
        this.variant = variantName;
        this.mss = 1460; // bytes
        this.cwnd = 1.0; // in MSS packets
        this.ssthresh = 32.0; // in MSS packets
        this.state = 'SLOW_START'; // 'SLOW_START', 'CONGESTION_AVOIDANCE', 'FAST_RECOVERY'
        
        // RTT & RTO Estimation (RFC 6298)
        this.srtt = 0.044; // smoothed RTT in seconds (default ~44ms)
        this.rttvar = 0.010;
        this.rto = 1.0; // Retransmission Timeout in seconds
        
        // ACK & Window Tracking
        this.dupAckCount = 0;
        this.lastAckedSeq = 0;
        this.highestSentSeq = 0;
        this.recoverSeq = 0; // for NewReno
        
        // Live mathematical formula string and last event message
        this.activeFormula = 'cwnd = cwnd + 1 (per ACK)';
        this.lastEventReason = 'Initialized in Slow Start';
    }

    reset() {
        this.cwnd = 1.0;
        this.ssthresh = 32.0;
        this.state = 'SLOW_START';
        this.dupAckCount = 0;
        this.lastAckedSeq = 0;
        this.highestSentSeq = 0;
        this.activeFormula = 'cwnd = cwnd + 1 (per ACK)';
        this.lastEventReason = 'Reset simulation';
    }

    updateRtt(sampleRtt) {
        if (!sampleRtt || sampleRtt <= 0) return;
        // Jacobson/Karels algorithm (RFC 6298)
        const alpha = 0.125;
        const beta = 0.25;
        this.rttvar = (1 - beta) * this.rttvar + beta * Math.abs(this.srtt - sampleRtt);
        this.srtt = (1 - alpha) * this.srtt + alpha * sampleRtt;
        this.rto = Math.max(0.2, this.srtt + Math.max(0.01, 4 * this.rttvar));
    }

    onTimeout(time) {
        // Base timeout behavior across classic algorithms
        this.ssthresh = Math.max(2.0, Math.floor(this.cwnd / 2.0));
        this.cwnd = 1.0;
        this.state = 'SLOW_START';
        this.dupAckCount = 0;
        this.activeFormula = 'ssthresh = max(2, cwnd/2); cwnd = 1 MSS';
        this.lastEventReason = `Timeout (RTO exceeded)! Reset cwnd to 1 MSS, ssthresh set to ${this.ssthresh.toFixed(1)} MSS.`;
    }
}

/**
 * TCP Tahoe (RFC 2001)
 * Features: Slow Start, Congestion Avoidance, Fast Retransmit.
 * Tahoe does NOT have Fast Recovery: On 3 dup ACKs, it resets cwnd to 1.
 */
export class TcpTahoe extends BaseTcpAgent {
    constructor() {
        super('TcpTahoe');
    }

    onAck(ackSeq, isDup, time) {
        if (isDup) {
            this.dupAckCount++;
            if (this.dupAckCount === 3) {
                // 3 Duplicate ACKs -> Fast Retransmit
                this.ssthresh = Math.max(2.0, Math.floor(this.cwnd / 2.0));
                this.cwnd = 1.0; // Tahoe drops to 1!
                this.state = 'SLOW_START';
                this.activeFormula = 'ssthresh = cwnd / 2; cwnd = 1 MSS';
                this.lastEventReason = `3 Duplicate ACKs received! Fast Retransmit fired. Tahoe resets cwnd to 1 MSS and ssthresh to ${this.ssthresh.toFixed(1)} MSS.`;
                return { retransmitNeeded: true, trigger: 'FAST_RETRANSMIT' };
            }
            return { retransmitNeeded: false, trigger: 'DUP_ACK' };
        }

        // Fresh ACK
        this.dupAckCount = 0;
        this.lastAckedSeq = ackSeq;

        if (this.cwnd < this.ssthresh) {
            // Slow Start: Exponential growth (+1 MSS per ACK)
            this.state = 'SLOW_START';
            this.cwnd += 1.0;
            this.activeFormula = 'cwnd = cwnd + 1 (Exponential growth: doubles every RTT)';
            this.lastEventReason = `Slow Start: Fresh ACK received. cwnd grew to ${this.cwnd.toFixed(1)} MSS (ssthresh = ${this.ssthresh.toFixed(1)}).`;
        } else {
            // Congestion Avoidance: Linear additive increase (AIMD: +1/cwnd per ACK => +1 MSS per RTT)
            this.state = 'CONGESTION_AVOIDANCE';
            this.cwnd += (1.0 / this.cwnd);
            this.activeFormula = 'cwnd = cwnd + 1/cwnd (AIMD Additive Increase: +1 MSS per RTT)';
            this.lastEventReason = `Congestion Avoidance: Linear growth. cwnd incremented to ${this.cwnd.toFixed(2)} MSS.`;
        }
        return { retransmitNeeded: false, trigger: 'FRESH_ACK' };
    }
}

/**
 * TCP Reno (RFC 5681)
 * Introduces Fast Recovery: On 3 dup ACKs, cwnd is halved instead of dropping to 1!
 */
export class TcpReno extends BaseTcpAgent {
    constructor() {
        super('TcpReno');
    }

    onAck(ackSeq, isDup, time) {
        if (isDup) {
            this.dupAckCount++;
            if (this.dupAckCount === 3) {
                // 3 Dup ACKs -> Enter Fast Retransmit & Fast Recovery
                this.ssthresh = Math.max(2.0, Math.floor(this.cwnd / 2.0));
                this.cwnd = this.ssthresh + 3.0; // Inflate window for the 3 packets that left pipe
                this.state = 'FAST_RECOVERY';
                this.activeFormula = 'ssthresh = cwnd / 2; cwnd = ssthresh + 3 MSS';
                this.lastEventReason = `3 Dup ACKs! Fast Retransmit executed. Reno enters Fast Recovery with cwnd inflated to ${this.cwnd.toFixed(1)} MSS (ssthresh = ${this.ssthresh.toFixed(1)}).`;
                return { retransmitNeeded: true, trigger: 'FAST_RETRANSMIT' };
            } else if (this.dupAckCount > 3 && this.state === 'FAST_RECOVERY') {
                // Window inflation during Fast Recovery
                this.cwnd += 1.0;
                this.activeFormula = 'cwnd = cwnd + 1 (Window inflation in Fast Recovery)';
                this.lastEventReason = `Dup ACK #${this.dupAckCount} in Fast Recovery. Inflating cwnd to ${this.cwnd.toFixed(1)} MSS.`;
                return { retransmitNeeded: false, trigger: 'FAST_RECOVERY_INFLATION' };
            }
            return { retransmitNeeded: false, trigger: 'DUP_ACK' };
        }

        // Fresh ACK
        if (this.state === 'FAST_RECOVERY') {
            // Exit Fast Recovery on fresh ACK (Deflate window)
            this.cwnd = this.ssthresh;
            this.state = 'CONGESTION_AVOIDANCE';
            this.dupAckCount = 0;
            this.lastAckedSeq = ackSeq;
            this.activeFormula = 'cwnd = ssthresh (Deflate window on Fast Recovery exit)';
            this.lastEventReason = `Fresh ACK arrived! Exiting Fast Recovery. cwnd deflated to ssthresh (${this.cwnd.toFixed(1)} MSS), entering Congestion Avoidance.`;
            return { retransmitNeeded: false, trigger: 'EXIT_FAST_RECOVERY' };
        }

        this.dupAckCount = 0;
        this.lastAckedSeq = ackSeq;

        if (this.cwnd < this.ssthresh) {
            this.state = 'SLOW_START';
            this.cwnd += 1.0;
            this.activeFormula = 'cwnd = cwnd + 1 (Slow Start)';
            this.lastEventReason = `Slow Start: cwnd increased to ${this.cwnd.toFixed(1)} MSS (ssthresh = ${this.ssthresh.toFixed(1)}).`;
        } else {
            this.state = 'CONGESTION_AVOIDANCE';
            this.cwnd += (1.0 / this.cwnd);
            this.activeFormula = 'cwnd = cwnd + 1/cwnd (Additive Increase)';
            this.lastEventReason = `Congestion Avoidance: cwnd grew to ${this.cwnd.toFixed(2)} MSS.`;
        }
        return { retransmitNeeded: false, trigger: 'FRESH_ACK' };
    }
}

/**
 * TCP NewReno (RFC 6582)
 * Handles multiple packet losses within a single window using Partial ACKs.
 */
export class TcpNewReno extends BaseTcpAgent {
    constructor() {
        super('TcpNewReno');
    }

    onAck(ackSeq, isDup, time) {
        if (isDup) {
            this.dupAckCount++;
            if (this.dupAckCount === 3) {
                this.recoverSeq = this.highestSentSeq;
                this.ssthresh = Math.max(2.0, Math.floor(this.cwnd / 2.0));
                this.cwnd = this.ssthresh + 3.0;
                this.state = 'FAST_RECOVERY';
                this.activeFormula = 'recoverSeq = highestSent; ssthresh = cwnd/2; cwnd = ssthresh + 3';
                this.lastEventReason = `3 Dup ACKs! NewReno marks recover point at Seq #${this.recoverSeq} and enters Fast Recovery.`;
                return { retransmitNeeded: true, trigger: 'FAST_RETRANSMIT' };
            } else if (this.dupAckCount > 3 && this.state === 'FAST_RECOVERY') {
                this.cwnd += 1.0;
                this.activeFormula = 'cwnd = cwnd + 1 (Fast Recovery inflation)';
                this.lastEventReason = `Dup ACK #${this.dupAckCount}: Inflated cwnd to ${this.cwnd.toFixed(1)} MSS.`;
                return { retransmitNeeded: false, trigger: 'FAST_RECOVERY_INFLATION' };
            }
            return { retransmitNeeded: false, trigger: 'DUP_ACK' };
        }

        // Fresh ACK
        if (this.state === 'FAST_RECOVERY') {
            if (ackSeq < this.recoverSeq) {
                // PARTIAL ACK: Lost another segment in the same window!
                // NewReno does NOT exit Fast Recovery; it immediately retransmits the next segment.
                this.cwnd = this.cwnd - (ackSeq - this.lastAckedSeq) / this.mss + 1.0;
                this.lastAckedSeq = ackSeq;
                this.activeFormula = 'Partial ACK: retransmit next unacked segment, keep Fast Recovery active';
                this.lastEventReason = `Partial ACK received (Seq #${ackSeq} < recover #${this.recoverSeq}). NewReno retransmits next missing segment without waiting for RTO!`;
                return { retransmitNeeded: true, trigger: 'PARTIAL_ACK' };
            } else {
                // FULL ACK: All lost segments in the recovery window acknowledged!
                this.cwnd = this.ssthresh;
                this.state = 'CONGESTION_AVOIDANCE';
                this.dupAckCount = 0;
                this.lastAckedSeq = ackSeq;
                this.activeFormula = 'Full ACK: cwnd = ssthresh; exit Fast Recovery';
                this.lastEventReason = `Full ACK received covering recovery window. Successfully exited Fast Recovery.`;
                return { retransmitNeeded: false, trigger: 'FULL_ACK' };
            }
        }

        this.dupAckCount = 0;
        this.lastAckedSeq = ackSeq;

        if (this.cwnd < this.ssthresh) {
            this.state = 'SLOW_START';
            this.cwnd += 1.0;
            this.activeFormula = 'cwnd = cwnd + 1 (Slow Start)';
            this.lastEventReason = `Slow Start: cwnd = ${this.cwnd.toFixed(1)} MSS.`;
        } else {
            this.state = 'CONGESTION_AVOIDANCE';
            this.cwnd += (1.0 / this.cwnd);
            this.activeFormula = 'cwnd = cwnd + 1/cwnd (AIMD)';
            this.lastEventReason = `Congestion Avoidance: cwnd = ${this.cwnd.toFixed(2)} MSS.`;
        }
        return { retransmitNeeded: false, trigger: 'FRESH_ACK' };
    }
}

/**
 * TCP Cubic (RFC 8312 - Linux Default)
 * Window growth is governed by a cubic function of elapsed time since last loss,
 * independent of RTT. Provides rapid recovery on Long Fat Networks (LFNs).
 */
export class TcpCubic extends BaseTcpAgent {
    constructor() {
        super('TcpCubic');
        this.cParam = 0.4; // Cubic scaling parameter
        this.beta = 0.7;   // Multiplicative decrease factor (0.7 in Linux Cubic vs 0.5 in Reno)
        this.wMax = 32.0;  // Window size prior to last loss event
        this.k = 0.0;      // Time required to scale window to W_max: K = cbrt(wMax * (1 - beta) / C)
        this.epochStart = 0; // Timestamp of last loss event
        this.tcpFriendlyWindow = 1.0;
    }

    reset() {
        super.reset();
        this.wMax = 32.0;
        this.k = 0.0;
        this.epochStart = 0;
    }

    onTimeout(time) {
        this.wMax = this.cwnd;
        this.ssthresh = Math.max(2.0, Math.floor(this.cwnd * this.beta));
        this.cwnd = 1.0;
        this.state = 'SLOW_START';
        this.dupAckCount = 0;
        this.epochStart = time;
        this.k = Math.cbrt((this.wMax * (1.0 - this.beta)) / this.cParam);
        this.activeFormula = 'Timeout: W_max = cwnd; ssthresh = beta * cwnd; cwnd = 1 MSS';
        this.lastEventReason = `Cubic Timeout! Reset cwnd to 1 MSS, W_max saved as ${this.wMax.toFixed(1)} MSS.`;
    }

    onAck(ackSeq, isDup, time) {
        if (isDup) {
            this.dupAckCount++;
            if (this.dupAckCount === 3) {
                // Loss detected: Multiplicative decrease by beta = 0.7
                this.wMax = this.cwnd;
                this.ssthresh = Math.max(2.0, this.cwnd * this.beta);
                this.cwnd = this.ssthresh;
                this.epochStart = time;
                // Calculate K: time period for cubic function to reach W_max
                this.k = Math.cbrt((this.wMax * (1.0 - this.beta)) / this.cParam);
                this.state = 'CUBIC_CONCAVE';
                this.activeFormula = `W_cubic(t) = C(t - K)³ + W_max (with C=${this.cParam}, β=${this.beta}, K=${this.k.toFixed(2)}s)`;
                this.lastEventReason = `Cubic Loss Event! W_max set to ${this.wMax.toFixed(1)} MSS, ssthresh = ${this.ssthresh.toFixed(1)} MSS. Entered Concave growth.`;
                return { retransmitNeeded: true, trigger: 'FAST_RETRANSMIT' };
            }
            return { retransmitNeeded: false, trigger: 'DUP_ACK' };
        }

        // Fresh ACK
        this.dupAckCount = 0;
        this.lastAckedSeq = ackSeq;

        if (this.cwnd < this.ssthresh) {
            // Slow Start
            this.state = 'SLOW_START';
            this.cwnd += 1.0;
            this.activeFormula = 'cwnd = cwnd + 1 (Slow Start)';
            this.lastEventReason = `Slow Start: cwnd increased to ${this.cwnd.toFixed(1)} MSS.`;
        } else {
            // Cubic Congestion Avoidance
            const tElapsed = Math.max(0.0, time - this.epochStart);
            const wCubic = this.cParam * Math.pow(tElapsed - this.k, 3) + this.wMax;

            // Standard Reno emulation check (TCP-friendly region)
            const wTcp = this.ssthresh + (3 * (1.0 - this.beta) / (2.0 - this.beta)) * (tElapsed / Math.max(0.01, this.srtt));
            
            const targetWindow = Math.max(wCubic, wTcp);
            // Increment cwnd per ACK towards target
            const delta = (targetWindow - this.cwnd) / Math.max(1.0, this.cwnd);
            this.cwnd += Math.max(0.05, Math.min(1.0, delta));

            if (tElapsed < this.k) {
                this.state = 'CUBIC_CONCAVE';
                this.activeFormula = `Concave Growth: W_cubic(t) = ${this.cParam}(t - ${this.k.toFixed(2)})³ + ${this.wMax.toFixed(1)}`;
                this.lastEventReason = `Cubic Concave Region (t < K): Window growing aggressively towards W_max (${this.cwnd.toFixed(2)} MSS).`;
            } else {
                this.state = 'CUBIC_CONVEX';
                this.activeFormula = `Convex Probing: W_cubic(t) = ${this.cParam}(t - ${this.k.toFixed(2)})³ + ${this.wMax.toFixed(1)}`;
                this.lastEventReason = `Cubic Convex Region (t > K): Probing for new network capacity past W_max (${this.cwnd.toFixed(2)} MSS).`;
            }
        }
        return { retransmitNeeded: false, trigger: 'FRESH_ACK' };
    }
}

export function createTcpAgent(variantName) {
    switch (variantName) {
        case 'TcpTahoe':
            return new TcpTahoe();
        case 'TcpReno':
        case 'TcpLinuxReno':
            return new TcpReno();
        case 'TcpNewReno':
            return new TcpNewReno();
        case 'TcpCubic':
        default:
            return new TcpCubic();
    }
}

