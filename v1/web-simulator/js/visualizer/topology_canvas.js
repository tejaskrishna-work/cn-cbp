/**
 * Interactive Topology Canvas Renderer (Enhanced High-Fidelity Edition)
 * Supports Multiple Topologies:
 * 1. Standard Bottleneck Dumbbell
 * 2. Dual-Flow Cross Traffic (TCP Fairness)
 * 3. 5G / Wireless Last-Mile (Fading Loss)
 * 4. Multi-Hop Backbone (3-Router Cascade)
 * 
 * Renders realistic vector network devices, fiber-optic light pulses,
 * animated packet particles, and click-to-inspect hit testing.
 */

export class TopologyCanvas {
    constructor(canvasElement, onSelectTarget) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.onSelectTarget = onSelectTarget;

        this.currentTopology = 'dumbbell';
        this.nodes = {};
        this.hoveredItem = null;
        this.selectedItem = null;
        this.fiberPulsePhase = 0;

        this.initCanvasSize();
        window.addEventListener('resize', () => this.initCanvasSize());

        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoveredItem = null; });
    }

    setTopology(topoKey) {
        this.currentTopology = topoKey;
        this.recalculateNodePositions();
    }

    initCanvasSize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width || 900;
        this.height = rect.height || 280;
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.recalculateNodePositions();
    }

    recalculateNodePositions() {
        const cy = this.height / 2 - 15;
        const w = this.width;

        if (this.currentTopology === 'multiflow') {
            // Dual-Flow Competing Senders
            this.nodes = {
                sender1: { id: 'sender', name: 'Flow 1 (H1)', ip: '10.1.1.1', type: 'server', x: w * 0.10, y: cy - 42, radius: 24, color: '#38bdf8' },
                sender2: { id: 'sender2', name: 'Flow 2 (H2)', ip: '10.1.1.2', type: 'server', x: w * 0.10, y: cy + 42, radius: 24, color: '#ec4899' },
                router1: { id: 'router1', name: 'Ingress R0', ip: '10.1.2.1', type: 'router', x: w * 0.36, y: cy, radius: 25, color: '#a855f7' },
                router2: { id: 'router2', name: 'Egress R1', ip: '10.1.2.2', type: 'router', x: w * 0.64, y: cy, radius: 25, color: '#a855f7' },
                receiver1: { id: 'receiver', name: 'Sink 1 (D1)', ip: '10.1.3.1', type: 'workstation', x: w * 0.90, y: cy - 42, radius: 24, color: '#10b981' },
                receiver2: { id: 'receiver2', name: 'Sink 2 (D2)', ip: '10.1.3.2', type: 'workstation', x: w * 0.90, y: cy + 42, radius: 24, color: '#10b981' },
                buffer: { id: 'buffer', name: 'Shared Bottleneck Buffer', x: w * 0.38, y: cy + 45, w: w * 0.24, h: 26 }
            };
        } else if (this.currentTopology === 'wireless') {
            // 5G Wireless Cell Last Mile
            this.nodes = {
                sender: { id: 'sender', name: 'Data Center H1', ip: '10.1.1.1', type: 'server', x: w * 0.12, y: cy, radius: 26, color: '#38bdf8' },
                router1: { id: 'router1', name: 'Core Router R0', ip: '10.1.2.1', type: 'router', x: w * 0.38, y: cy, radius: 25, color: '#a855f7' },
                baseStation: { id: 'baseStation', name: '5G gNodeB Tower', ip: '10.1.2.2', type: '5gtower', x: w * 0.65, y: cy, radius: 26, color: '#f59e0b' },
                receiver: { id: 'receiver', name: 'Mobile Client (UE)', ip: '10.1.3.1', type: 'mobile', x: w * 0.90, y: cy, radius: 24, color: '#10b981' },
                buffer: { id: 'buffer', name: 'Radio Link Buffer (RLC)', x: w * 0.40, y: cy + 40, w: w * 0.22, h: 26 }
            };
        } else if (this.currentTopology === 'multihop') {
            // Multi-Hop 3-Router Cascade
            this.nodes = {
                sender: { id: 'sender', name: 'Sender H1', ip: '10.1.1.1', type: 'server', x: w * 0.10, y: cy, radius: 24, color: '#38bdf8' },
                router1: { id: 'router1', name: 'Edge R0', ip: '10.1.2.1', type: 'router', x: w * 0.30, y: cy, radius: 23, color: '#a855f7' },
                router2: { id: 'router2', name: 'Core R1', ip: '10.1.2.2', type: 'router', x: w * 0.50, y: cy, radius: 23, color: '#a855f7' },
                router3: { id: 'router3', name: 'Edge R2', ip: '10.1.2.3', type: 'router', x: w * 0.70, y: cy, radius: 23, color: '#a855f7' },
                receiver: { id: 'receiver', name: 'Receiver H2', ip: '10.1.3.1', type: 'workstation', x: w * 0.90, y: cy, radius: 24, color: '#10b981' },
                buffer: { id: 'buffer', name: 'Core Queue R1', x: w * 0.42, y: cy + 40, w: w * 0.16, h: 26 }
            };
        } else {
            // Standard Dumbbell
            this.nodes = {
                sender: { id: 'sender', name: 'Sender Host (H1)', ip: '10.1.1.1', type: 'server', x: w * 0.12, y: cy, radius: 27, color: '#38bdf8' },
                router1: { id: 'router1', name: 'Ingress Router (R0)', ip: '10.1.2.1', type: 'router', x: w * 0.36, y: cy, radius: 26, color: '#a855f7' },
                router2: { id: 'router2', name: 'Egress Router (R1)', ip: '10.1.2.2', type: 'router', x: w * 0.64, y: cy, radius: 26, color: '#a855f7' },
                receiver: { id: 'receiver', name: 'Receiver Host (H2)', ip: '10.1.3.1', type: 'workstation', x: w * 0.88, y: cy, radius: 27, color: '#10b981' },
                buffer: { id: 'buffer', name: 'Bottleneck Buffer', x: w * 0.38, y: cy + 40, w: w * 0.24, h: 28 }
            };
        }
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        this.hoveredItem = this.hitTest(pos.x, pos.y);
        this.canvas.style.cursor = this.hoveredItem ? 'pointer' : 'default';
    }

    handleClick(e) {
        const pos = this.getMousePos(e);
        const hit = this.hitTest(pos.x, pos.y);
        if (hit && this.onSelectTarget) {
            this.selectedItem = hit;
            this.onSelectTarget(hit);
        }
    }

    hitTest(x, y) {
        if (this.currentRenderedPackets) {
            for (const p of this.currentRenderedPackets) {
                const dist = Math.hypot(p.screenX - x, p.screenY - y);
                if (dist <= 14) {
                    return { type: 'packet', data: p.packet };
                }
            }
        }

        const buf = this.nodes.buffer;
        if (buf && x >= buf.x && x <= buf.x + buf.w && y >= buf.y && y <= buf.y + buf.h) {
            return { type: 'buffer', data: this.lastBufferRef };
        }

        for (const [key, node] of Object.entries(this.nodes)) {
            if (key === 'buffer') continue;
            const dist = Math.hypot(node.x - x, node.y - y);
            if (dist <= node.radius + 8) {
                return { type: 'node', id: node.id, nodeName: node.name, data: node };
            }
        }
        return null;
    }

    render(sim) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        this.lastBufferRef = sim.buffer;
        this.fiberPulsePhase = (this.fiberPulsePhase + 0.05) % 1.0;

        // 1. Cyber Grid
        this.drawCyberGrid(ctx);

        // 2. Links & Optical Pulses
        this.drawLinks(ctx, sim);

        // 3. Nodes with High-Detail Vector Icons
        this.drawNodes(ctx, sim);

        // 4. Bottleneck Buffer
        if (this.nodes.buffer) {
            this.drawBuffer(ctx, sim.buffer);
        }

        // 5. In-Flight Moving Packets
        this.drawPackets(ctx, sim);
    }

    drawCyberGrid(ctx) {
        ctx.strokeStyle = 'rgba(26, 36, 59, 0.35)';
        ctx.lineWidth = 1;
        const step = 25;
        for (let x = 0; x < this.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }

    drawLinks(ctx, sim) {
        const n = this.nodes;
        const cy = this.height / 2 - 15;

        if (this.currentTopology === 'multiflow') {
            // Flow 1 & Flow 2 Access links to R0
            this.drawCabledLink(ctx, n.sender1.x, n.sender1.y, n.router1.x, n.router1.y, '#334155', '100M', false);
            this.drawCabledLink(ctx, n.sender2.x, n.sender2.y, n.router1.x, n.router1.y, '#334155', '100M', false);
            // Bottleneck R0 -> R1
            this.drawCabledLink(ctx, n.router1.x, cy, n.router2.x, cy, '#f59e0b', `${sim.params.bandwidthMbps}M`, true);
            // Egress R1 -> D1 & D2
            this.drawCabledLink(ctx, n.router2.x, n.router2.y, n.receiver1.x, n.receiver1.y, '#334155', '100M', false);
            this.drawCabledLink(ctx, n.router2.x, n.router2.y, n.receiver2.x, n.receiver2.y, '#334155', '100M', false);

            // ACK Return Channel
            this.drawCurvedAckChannel(ctx, n.receiver1.x, cy + 40, n.sender1.x, cy + 40);

        } else if (this.currentTopology === 'wireless') {
            // Data center to Core Router
            this.drawCabledLink(ctx, n.sender.x, cy, n.router1.x, cy, '#334155', '1 Gbps', false);
            // Core router to 5G Base Station (Fronthaul)
            this.drawCabledLink(ctx, n.router1.x, cy, n.baseStation.x, cy, '#38bdf8', '10 Gbps Fiber', false);
            // Wireless Over-The-Air Link (Base Station to Mobile)
            this.drawWirelessLink(ctx, n.baseStation.x, cy, n.receiver.x, cy, sim);
            // ACK Return Channel
            this.drawCurvedAckChannel(ctx, n.receiver.x, cy + 30, n.sender.x, cy + 30);

        } else if (this.currentTopology === 'multihop') {
            this.drawCabledLink(ctx, n.sender.x, cy, n.router1.x, cy, '#334155', '100M', false);
            this.drawCabledLink(ctx, n.router1.x, cy, n.router2.x, cy, '#f59e0b', `${sim.params.bandwidthMbps}M`, true);
            this.drawCabledLink(ctx, n.router2.x, cy, n.router3.x, cy, '#334155', '50M', false);
            this.drawCabledLink(ctx, n.router3.x, cy, n.receiver.x, cy, '#334155', '100M', false);
            this.drawCurvedAckChannel(ctx, n.receiver.x, cy + 30, n.sender.x, cy + 30);

        } else {
            // Standard Dumbbell
            this.drawCabledLink(ctx, n.sender.x, cy, n.router1.x, cy, '#334155', '100 Mbps, 2ms', false);
            this.drawCabledLink(ctx, n.router1.x, cy, n.router2.x, cy, '#f59e0b', `BOTTLENECK: ${sim.params.bandwidthMbps} Mbps, ${sim.params.propagationDelayMs}ms`, true);
            this.drawCabledLink(ctx, n.router2.x, cy, n.receiver.x, cy, '#334155', '100 Mbps, 2ms', false);
            this.drawCurvedAckChannel(ctx, n.receiver.x, cy + 30, n.sender.x, cy + 30);
        }
    }

    drawCabledLink(ctx, x1, y1, x2, y2, color, label, isBottleneck) {
        // Outer jacket
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = isBottleneck ? 8 : 5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Inner core
        ctx.strokeStyle = color;
        ctx.lineWidth = isBottleneck ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Animated Optical Photon Pulse
        const pulseT = this.fiberPulsePhase;
        const px = x1 + (x2 - x1) * pulseT;
        const py = y1 + (y2 - y1) * pulseT;
        ctx.fillStyle = isBottleneck ? '#fbbf24' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, isBottleneck ? 3 : 2, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (label) {
            ctx.fillStyle = isBottleneck ? '#f59e0b' : '#64748b';
            ctx.font = isBottleneck ? 'bold 10px monospace' : '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, (x1 + x2) / 2, Math.min(y1, y2) - 12);
        }
    }

    drawWirelessLink(ctx, x1, y1, x2, y2, sim) {
        // Radiating 5G Waves
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);

        for (let r = 15; r <= 55; r += 14) {
            ctx.beginPath();
            ctx.arc(x1 + 10, y1, r, -Math.PI / 4, Math.PI / 4);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`5G OTA Channel (${(sim.params.packetLossRate * 100).toFixed(1)}% fading loss)`, (x1 + x2) / 2, y1 - 15);
    }

    drawCurvedAckChannel(ctx, x1, y1, x2, y2) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(this.width / 2, y1 + 65, x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`ACK Return Channel`, this.width / 2, y1 + 60);
    }

    drawNodes(ctx, sim) {
        for (const [key, node] of Object.entries(this.nodes)) {
            if (key === 'buffer') continue;

            const isHovered = this.hoveredItem && this.hoveredItem.id === node.id;
            const isSelected = this.selectedItem && this.selectedItem.id === node.id;

            // Halo glow on hover / select
            if (isHovered || isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.15)';
                ctx.fill();
            }

            // Draw Detailed Vector Device Based on Type
            if (node.type === 'server') {
                this.drawServerRack(ctx, node.x, node.y, node.color, isSelected);
            } else if (node.type === 'router') {
                this.drawCiscoRouter(ctx, node.x, node.y, node.color, isSelected);
            } else if (node.type === '5gtower') {
                this.draw5gTower(ctx, node.x, node.y, node.color, isSelected);
            } else if (node.type === 'mobile') {
                this.drawMobileDevice(ctx, node.x, node.y, node.color, isSelected);
            } else {
                this.drawWorkstation(ctx, node.x, node.y, node.color, isSelected);
            }

            // Node Name & IP
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, node.x, node.y - node.radius - 8);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px monospace';
            ctx.fillText(node.ip, node.x, node.y + node.radius + 14);

            // Special badges
            if (node.id === 'sender') {
                const state = sim.tcpAgent.state.replace('_', ' ');
                ctx.fillStyle = '#38bdf8';
                ctx.font = '10px monospace';
                ctx.fillText(`[${state}]`, node.x, node.y + node.radius + 26);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(`cwnd: ${sim.tcpAgent.cwnd.toFixed(1)} MSS`, node.x, node.y + node.radius + 38);
            } else if (node.id === 'receiver') {
                ctx.fillStyle = '#10b981';
                ctx.font = '10px monospace';
                ctx.fillText(`ACK: #${sim.expectedAckNumber}`, node.x, node.y + node.radius + 26);
            }
        }
    }

    /* Vector Network Device Renderers */

    drawServerRack(ctx, x, y, color, isSelected) {
        // Server Chassis Box
        const w = 36;
        const h = 42;
        ctx.fillStyle = '#0a101f';
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = isSelected ? '#38bdf8' : color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);

        // Server Drive Trays
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - w / 2 + 3, y - h / 2 + 5, w - 6, 8);
        ctx.fillRect(x - w / 2 + 3, y - h / 2 + 16, w - 6, 8);
        ctx.fillRect(x - w / 2 + 3, y - h / 2 + 27, w - 6, 8);

        // Blinking Green / Blue LEDs
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + w / 2 - 8, y - h / 2 + 7, 3, 3);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(x + w / 2 - 8, y - h / 2 + 18, 3, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + w / 2 - 8, y - h / 2 + 29, 3, 3);
    }

    drawCiscoRouter(ctx, x, y, color, isSelected) {
        // Outer Router Disc
        const r = 24;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#0a101f';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#38bdf8' : color;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Cross Directional Router Arrows (Cisco symbol)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        // In-out arrows
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x, y + 12);
        ctx.stroke();

        // Arrow Heads
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x - 12, y, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 12, y, 2.5, 0, Math.PI * 2);
        ctx.arc(x, y - 12, 2.5, 0, Math.PI * 2);
        ctx.arc(x, y + 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    draw5gTower(ctx, x, y, color, isSelected) {
        // Lattice Mast
        ctx.strokeStyle = isSelected ? '#38bdf8' : color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 18);
        ctx.lineTo(x, y - 18);
        ctx.lineTo(x + 12, y + 18);
        ctx.stroke();

        // Cross Braces
        ctx.beginPath();
        ctx.moveTo(x - 7, y + 5);
        ctx.lineTo(x + 7, y + 5);
        ctx.moveTo(x - 4, y - 6);
        ctx.lineTo(x + 4, y - 6);
        ctx.stroke();

        // Top Transceiver Antenna
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y - 18, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawMobileDevice(ctx, x, y, color, isSelected) {
        // Smartphone Chassis
        const w = 22;
        const h = 38;
        ctx.fillStyle = '#0a101f';
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = isSelected ? '#38bdf8' : color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);

        // Screen
        ctx.fillStyle = '#0f2438';
        ctx.fillRect(x - w / 2 + 2, y - h / 2 + 4, w - 4, h - 10);

        // Home button / Speaker
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(x, y + h / 2 - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawWorkstation(ctx, x, y, color, isSelected) {
        // Monitor Screen
        const w = 34;
        const h = 26;
        ctx.fillStyle = '#0a101f';
        ctx.fillRect(x - w / 2, y - h / 2 - 4, w, h);
        ctx.strokeStyle = isSelected ? '#38bdf8' : color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - w / 2, y - h / 2 - 4, w, h);

        // Screen Display Glow
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(x - w / 2 + 2, y - h / 2 - 2, w - 4, h - 4);

        // Stand and Base
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 3, y + h / 2 - 4, 6, 7);
        ctx.fillRect(x - 12, y + h / 2 + 3, 24, 3);
    }

    drawBuffer(ctx, buffer) {
        const b = this.nodes.buffer;
        const isHovered = this.hoveredItem && this.hoveredItem.type === 'buffer';
        const isSelected = this.selectedItem && this.selectedItem.type === 'buffer';

        ctx.fillStyle = isHovered || isSelected ? '#151e34' : '#0a101f';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#243254';
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Gradient Fill
        const fillRatio = Math.min(1.0, buffer.getFillRatio());
        const fillW = b.w * fillRatio;
        const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(0.7, '#6366f1');
        grad.addColorStop(1, '#ef4444');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x, b.y, fillW, b.h);

        // Slot Lines
        const slotWidth = b.w / buffer.maxPackets;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 1; i < buffer.maxPackets; i++) {
            const sx = b.x + i * slotWidth;
            ctx.beginPath();
            ctx.moveTo(sx, b.y);
            ctx.lineTo(sx, b.y + b.h);
            ctx.stroke();
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Queue Buffer: ${buffer.getOccupancy()} / ${buffer.maxPackets} pkts (${buffer.getQueuingDelayMs().toFixed(1)}ms queue delay)`,
            b.x + b.w / 2,
            b.y + b.h + 14
        );
    }

    drawPackets(ctx, sim) {
        this.currentRenderedPackets = [];
        const n = this.nodes;
        const cy = this.height / 2 - 15;
        const w = this.width;

        // Draw In-Flight Forward Data Packets
        for (const pkt of sim.packetsInFlight) {
            let px, py;
            const prog = pkt.progress;

            const xStart = n.sender ? n.sender.x : n.sender1.x;
            const xMid1 = n.router1 ? n.router1.x : w * 0.36;
            const xMid2 = n.router2 ? n.router2.x : (n.baseStation ? n.baseStation.x : w * 0.64);
            const xEnd = n.receiver ? n.receiver.x : n.receiver1.x;

            if (prog < 0.3) {
                const segP = prog / 0.3;
                px = xStart + segP * (xMid1 - xStart);
                py = cy;
            } else if (prog >= 0.3 && prog < 0.7) {
                const segP = (prog - 0.3) / 0.4;
                px = xMid1 + segP * (xMid2 - xMid1);
                py = cy;
            } else {
                const segP = (prog - 0.7) / 0.3;
                px = xMid2 + segP * (xEnd - xMid2);
                py = cy;
            }

            this.currentRenderedPackets.push({ screenX: px, screenY: py, packet: pkt });

            const isHovered = this.hoveredItem && this.hoveredItem.data && this.hoveredItem.data.id === pkt.id;
            ctx.fillStyle = pkt.getDefaultColor();
            ctx.beginPath();
            ctx.arc(px, py, isHovered ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${pkt.seq}`, px, py - 9);
        }

        // Draw In-Flight Return ACKs
        for (const ack of sim.acksInFlight) {
            const p = ack.progress;
            const xEnd = n.receiver ? n.receiver.x : n.receiver1.x;
            const xStart = n.sender ? n.sender.x : n.sender1.x;

            const p0x = xEnd;
            const p0y = cy + 30;
            const p1x = this.width / 2;
            const p1y = cy + 85;
            const p2x = xStart;
            const p2y = cy + 30;

            const t = p;
            const px = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
            const py = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;

            this.currentRenderedPackets.push({ screenX: px, screenY: py, packet: ack });

            ctx.fillStyle = ack.getDefaultColor();
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = ack.isDupAck ? '#ec4899' : '#10b981';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ack.isDupAck ? `DUP#${ack.dupCount}` : `ACK`, px, py + 12);
        }
    }
}
