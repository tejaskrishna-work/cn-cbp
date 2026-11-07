/**
 * TCP Packet Model
 * Encapsulates TCP segment details, header fields, and visual animation state.
 */
export class Packet {
    constructor({
        id,
        seq = 0,
        ack = 0,
        size = 1460, // MSS
        type = 'DATA', // 'DATA', 'ACK', 'SYN', 'FIN'
        flags = ['ACK'],
        src = '10.1.1.1:49152',
        dst = '10.1.3.1:9000',
        sendTime = 0,
        isRetransmission = false,
        isDupAck = false,
        dupCount = 0
    }) {
        this.id = id;
        this.seq = seq;
        this.ack = ack;
        this.size = size;
        this.type = type;
        this.flags = flags;
        this.src = src;
        this.dst = dst;
        this.sendTime = sendTime;
        this.isRetransmission = isRetransmission;
        this.isDupAck = isDupAck;
        this.dupCount = dupCount;

        // Visual animation coordinates (0.0 to 1.0 along transmission path)
        this.progress = 0.0;
        this.pathSegment = 'ACCESS_TX'; // 'ACCESS_TX', 'QUEUE', 'BOTTLENECK', 'ACCESS_RX', 'ACK_PATH'
        this.isDropped = false;
        this.dropReason = null;
        this.color = this.getDefaultColor();
    }

    getDefaultColor() {
        if (this.isDropped) return '#ef4444'; // Red
        if (this.isRetransmission) return '#f59e0b'; // Amber / Orange
        if (this.type === 'ACK') {
            return this.isDupAck ? '#ec4899' : '#10b981'; // Pink for dupack, Emerald for fresh ack
        }
        return '#06b6d4'; // Cyan for standard data
    }

    getDetails() {
        return {
            id: this.id,
            type: this.type,
            seq: this.seq,
            ack: this.ack,
            payloadBytes: `${this.seq} - ${this.seq + this.size - 1} (${this.size} B)`,
            flags: this.flags.join(', '),
            src: this.src,
            dst: this.dst,
            sendTime: `${(this.sendTime).toFixed(3)} s`,
            isRetransmission: this.isRetransmission,
            isDupAck: this.isDupAck,
            dupCount: this.dupCount,
            status: this.isDropped ? `DROPPED (${this.dropReason})` : (this.progress >= 1.0 ? 'DELIVERED' : 'IN_FLIGHT')
        };
    }
}

