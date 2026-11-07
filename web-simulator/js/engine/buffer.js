/**
 * Router Queue Buffer Model
 * Models FIFO queue, DropTail packet drops, and queuing delay.
 */
export class RouterBuffer {
    constructor(maxPackets = 50, bandwidthMbps = 10.0) {
        this.maxPackets = maxPackets;
        this.bandwidthMbps = bandwidthMbps;
        this.queue = [];
        this.droppedPackets = [];
        this.totalEnqueued = 0;
        this.totalDequeued = 0;
        this.totalDropped = 0;
    }

    setCapacity(maxPackets) {
        this.maxPackets = Math.max(5, maxPackets);
    }

    setBandwidth(bwMbps) {
        this.bandwidthMbps = Math.max(0.1, bwMbps);
    }

    /**
     * Attempts to enqueue a packet into the bottleneck buffer.
     * Returns true if accepted, false if dropped (DropTail).
     */
    enqueue(packet, currentTime) {
        this.totalEnqueued++;
        if (this.queue.length >= this.maxPackets) {
            // Buffer overflow drop
            packet.isDropped = true;
            packet.dropReason = 'BUFFER_OVERFLOW';
            this.totalDropped++;
            this.droppedPackets.push({
                time: currentTime,
                packetId: packet.id,
                seq: packet.seq,
                reason: 'Queue Full (DropTail)'
            });
            return false;
        }

        this.queue.push(packet);
        return true;
    }

    dequeue() {
        if (this.queue.length === 0) return null;
        this.totalDequeued++;
        return this.queue.shift();
    }

    getOccupancy() {
        return this.queue.length;
    }

    getFillRatio() {
        return this.queue.length / this.maxPackets;
    }

    /**
     * Queuing Delay = (current_queue_bytes) / Bandwidth
     */
    getQueuingDelayMs(mss = 1460) {
        const queueBytes = this.queue.length * mss;
        const bits = queueBytes * 8;
        return (bits / (this.bandwidthMbps * 1e6)) * 1000.0;
    }

    clear() {
        this.queue = [];
        this.droppedPackets = [];
        this.totalEnqueued = 0;
        this.totalDequeued = 0;
        this.totalDropped = 0;
    }
}

