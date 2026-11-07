/**
 * Interactive Topology Canvas Renderer - Version 2.0 (Clean Academic Theme)
 * White / Blueprint Canvas with Clean Network Engineering Devices
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
        this.pulsePhase = 0;

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
        this.height = rect.height || 260;
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.recalculateNodePositions();
    }

    recalculateNodePositions() {
        const cy = this.height / 2 - 12;
        const w = this.width;

        if (this.currentTopology === 'multiflow') {
            this.nodes = {
                sender1: { id: 'sender', name: 'Flow 1 (H1)', ip: '10.1.1.1', type: 'server', x: w * 0.12, y: cy - 42, radius: 22, color: '#2563eb' },
                sender2: { id: 'sender2', name: 'Flow 2 (H2)', ip: '10.1.1.2', type: 'server', x: w * 0.12, y: cy + 42, radius: 22, color: '#0891b2' },
                router1: { id: 'router1', name: 'Ingress R0', ip: '10.1.2.1', type: 'router', x: w * 0.38, y: cy, radius: 24, color: '#1e293b' },
                router2: { id: 'router2', name: 'Egress R1', ip: '10.1.2.2', type: 'router', x: w * 0.62, y: cy, radius: 24, color: '#1e293b' },
                receiver1: { id: 'receiver', name: 'Sink 1 (D1)', ip: '10.1.3.1', type: 'workstation', x: w * 0.88, y: cy - 42, radius: 22, color: '#059669' },
                receiver2: { id: 'receiver2', name: 'Sink 2 (D2)', ip: '10.1.3.2', type: 'workstation', x: w * 0.88, y: cy + 42, radius: 22, color: '#059669' },
                buffer: { id: 'buffer', name: 'Shared Queue Buffer', x: w * 0.39, y: cy + 42, w: w * 0.22, h: 24 }
            };
        } else if (this.currentTopology === 'wireless') {
            this.nodes = {
                sender: { id: 'sender', name: 'Content Server (H1)', ip: '10.1.1.1', type: 'server', x: w * 0.14, y: cy, radius: 24, color: '#2563eb' },
                router1: { id: 'router1', name: 'Core Router (R0)', ip: '10.1.2.1', type: 'router', x: w * 0.40, y: cy, radius: 24, color: '#1e293b' },
                baseStation: { id: 'baseStation', name: '5G gNodeB Tower', ip: '10.1.2.2', type: '5gtower', x: w * 0.65, y: cy, radius: 25, color: '#d97706' },
                receiver: { id: 'receiver', name: 'Mobile Device (UE)', ip: '10.1.3.1', type: 'mobile', x: w * 0.88, y: cy, radius: 22, color: '#059669' },
                buffer: { id: 'buffer', name: 'Radio Link Queue (RLC)', x: w * 0.42, y: cy + 38, w: w * 0.21, h: 24 }
            };
        } else if (this.currentTopology === 'multihop') {
            this.nodes = {
                sender: { id: 'sender', name: 'Sender (H1)', ip: '10.1.1.1', type: 'server', x: w * 0.12, y: cy, radius: 22, color: '#2563eb' },
                router1: { id: 'router1', name: 'Edge R0', ip: '10.1.2.1', type: 'router', x: w * 0.32, y: cy, radius: 22, color: '#1e293b' },
                router2: { id: 'router2', name: 'Core R1', ip: '10.1.2.2', type: 'router', x: w * 0.52, y: cy, radius: 22, color: '#1e293b' },
                router3: { id: 'router3', name: 'Edge R2', ip: '10.1.2.3', type: 'router', x: w * 0.72, y: cy, radius: 22, color: '#1e293b' },
                receiver: { id: 'receiver', name: 'Receiver (H2)', ip: '10.1.3.1', type: 'workstation', x: w * 0.90, y: cy, radius: 22, color: '#059669' },
                buffer: { id: 'buffer', name: 'Core Queue R1', x: w * 0.44, y: cy + 38, w: w * 0.16, h: 24 }
            };
        } else {
            // Standard Dumbbell
            this.nodes = {
                sender: { id: 'sender', name: 'Sender Host (H1)', ip: '10.1.1.1', type: 'server', x: w * 0.14, y: cy, radius: 24, color: '#2563eb' },
                router1: { id: 'router1', name: 'Router 1 (R0)', ip: '10.1.2.1', type: 'router', x: w * 0.38, y: cy, radius: 24, color: '#1e293b' },
                router2: { id: 'router2', name: 'Router 2 (R1)', ip: '10.1.2.2', type: 'router', x: w * 0.62, y: cy, radius: 24, color: '#1e293b' },
                receiver: { id: 'receiver', name: 'Receiver Host (H2)', ip: '10.1.3.1', type: 'workstation', x: w * 0.86, y: cy, radius: 24, color: '#059669' },
                buffer: { id: 'buffer', name: 'Bottleneck Queue', x: w * 0.40, y: cy + 38, w: w * 0.20, h: 25 }
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
        this.pulsePhase = (this.pulsePhase + 0.04) % 1.0;

        // 1. Blueprint Grid (Subtle Light Technical Grid)
        this.drawBlueprintGrid(ctx);

        // 2. Physical Links
        this.drawLinks(ctx, sim);

        // 3. Vector Network Hardware Nodes
        this.drawNodes(ctx, sim);

        // 4. Bottleneck FIFO Queue
        if (this.nodes.buffer) {
            this.drawBuffer(ctx, sim.buffer);
        }

        // 5. In-Flight Packets
        this.drawPackets(ctx, sim);
    }

    drawBlueprintGrid(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        const step = 20;
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
        const cy = this.height / 2 - 12;

        if (this.currentTopology === 'multiflow') {
            this.drawCable(ctx, n.sender1.x, n.sender1.y, n.router1.x, n.router1.y, '#94a3b8', '100 Mbps', false);
            this.drawCable(ctx, n.sender2.x, n.sender2.y, n.router1.x, n.router1.y, '#94a3b8', '100 Mbps', false);
            this.drawCable(ctx, n.router1.x, cy, n.router2.x, cy, '#2563eb', `Bottleneck: ${sim.params.bandwidthMbps}M`, true);
            this.drawCable(ctx, n.router2.x, n.router2.y, n.receiver1.x, n.receiver1.y, '#94a3b8', '100 Mbps', false);
            this.drawCable(ctx, n.router2.x, n.router2.y, n.receiver2.x, n.receiver2.y, '#94a3b8', '100 Mbps', false);
            this.drawAckCurve(ctx, n.receiver1.x, cy + 35, n.sender1.x, cy + 35);
        } else if (this.currentTopology === 'wireless') {
            this.drawCable(ctx, n.sender.x, cy, n.router1.x, cy, '#94a3b8', '1 Gbps', false);
            this.drawCable(ctx, n.router1.x, cy, n.baseStation.x, cy, '#0284c7', '10 Gbps Fiber', false);
            this.drawWirelessOTA(ctx, n.baseStation.x, cy, n.receiver.x, cy, sim);
            this.drawAckCurve(ctx, n.receiver.x, cy + 30, n.sender.x, cy + 30);
        } else if (this.currentTopology === 'multihop') {
            this.drawCable(ctx, n.sender.x, cy, n.router1.x, cy, '#94a3b8', '100M', false);
            this.drawCable(ctx, n.router1.x, cy, n.router2.x, cy, '#2563eb', `Bottleneck: ${sim.params.bandwidthMbps}M`, true);
            this.drawCable(ctx, n.router2.x, cy, n.router3.x, cy, '#94a3b8', '50M', false);
            this.drawCable(ctx, n.router3.x, cy, n.receiver.x, cy, '#94a3b8', '100M', false);
            this.drawAckCurve(ctx, n.receiver.x, cy + 30, n.sender.x, cy + 30);
        } else {
            // Dumbbell
            this.drawCable(ctx, n.sender.x, cy, n.router1.x, cy, '#94a3b8', '100 Mbps, 2ms', false);
            this.drawCable(ctx, n.router1.x, cy, n.router2.x, cy, '#2563eb', `Bottleneck: ${sim.params.bandwidthMbps} Mbps, ${sim.params.propagationDelayMs}ms`, true);
            this.drawCable(ctx, n.router2.x, cy, n.receiver.x, cy, '#94a3b8', '100 Mbps, 2ms', false);
            this.drawAckCurve(ctx, n.receiver.x, cy + 30, n.sender.x, cy + 30);
        }
    }

    drawCable(ctx, x1, y1, x2, y2, color, label, isBottleneck) {
        ctx.strokeStyle = isBottleneck ? '#2563eb' : '#cbd5e1';
        ctx.lineWidth = isBottleneck ? 4 : 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Moving pulse dot
        const t = this.pulsePhase;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        ctx.fillStyle = isBottleneck ? '#1d4ed8' : '#0284c7';
        ctx.beginPath();
        ctx.arc(px, py, isBottleneck ? 2.5 : 1.8, 0, Math.PI * 2);
        ctx.fill();

        if (label) {
            ctx.fillStyle = isBottleneck ? '#1d4ed8' : '#64748b';
            ctx.font = isBottleneck ? 'bold 10px sans-serif' : '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, (x1 + x2) / 2, Math.min(y1, y2) - 10);
        }
    }

    drawWirelessOTA(ctx, x1, y1, x2, y2, sim) {
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 4]);
        for (let r = 14; r <= 48; r += 12) {
            ctx.beginPath();
            ctx.arc(x1 + 8, y1, r, -Math.PI / 4, Math.PI / 4);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        ctx.fillStyle = '#b45309';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`5G OTA Channel (${(sim.params.packetLossRate * 100).toFixed(1)}% loss)`, (x1 + x2) / 2, y1 - 12);
    }

    drawAckCurve(ctx, x1, y1, x2, y2) {
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(this.width / 2, y1 + 55, x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#059669';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`ACK Return Channel`, this.width / 2, y1 + 52);
    }

    drawNodes(ctx, sim) {
        for (const [key, node] of Object.entries(this.nodes)) {
            if (key === 'buffer') continue;

            const isHovered = this.hoveredItem && this.hoveredItem.id === node.id;
            const isSelected = this.selectedItem && this.selectedItem.id === node.id;

            // Subtle focus ring
            if (isHovered || isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? 'rgba(37, 99, 235, 0.15)' : 'rgba(15, 23, 42, 0.05)';
                ctx.fill();
            }

            // Draw Vector Device Icon
            if (node.type === 'server') {
                this.drawServerRack(ctx, node.x, node.y, isSelected);
            } else if (node.type === 'router') {
                this.drawCiscoRouter(ctx, node.x, node.y, isSelected);
            } else if (node.type === '5gtower') {
                this.draw5gTower(ctx, node.x, node.y, isSelected);
            } else if (node.type === 'mobile') {
                this.drawMobileDevice(ctx, node.x, node.y, isSelected);
            } else {
                this.drawWorkstation(ctx, node.x, node.y, isSelected);
            }

            // Labels
            ctx.fillStyle = '#0f172a';
            ctx.font = '600 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.name, node.x, node.y - node.radius - 8);

            ctx.fillStyle = '#64748b';
            ctx.font = '10px monospace';
            ctx.fillText(node.ip, node.x, node.y + node.radius + 14);

            // Active Badges
            if (node.id === 'sender') {
                ctx.fillStyle = '#2563eb';
                ctx.font = 'bold 9px monospace';
                ctx.fillText(`[${sim.tcpAgent.state.replace('_', ' ')}]`, node.x, node.y + node.radius + 25);
                ctx.fillStyle = '#334155';
                ctx.fillText(`cwnd: ${sim.tcpAgent.cwnd.toFixed(1)} MSS`, node.x, node.y + node.radius + 36);
            } else if (node.id === 'receiver') {
                ctx.fillStyle = '#059669';
                ctx.font = 'bold 9px monospace';
                ctx.fillText(`ACK: #${sim.expectedAckNumber}`, node.x, node.y + node.radius + 25);
            }
        }
    }

    drawServerRack(ctx, x, y, isSelected) {
        const w = 32;
        const h = 38;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = isSelected ? '#2563eb' : '#334155';
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);

        // Trays
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x - w / 2 + 3, y - h / 2 + 5, w - 6, 7);
        ctx.fillRect(x - w / 2 + 3, y - h / 2 + 15, w - 6, 7);
        ctx.fillRect(x - w / 2 + 3, y - h / 2 + 25, w - 6, 7);

        // Small indicator LED
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(x + w / 2 - 7, y - h / 2 + 7, 3, 3);
        ctx.fillStyle = '#059669';
        ctx.fillRect(x + w / 2 - 7, y - h / 2 + 17, 3, 3);
    }

    drawCiscoRouter(ctx, x, y, isSelected) {
        const r = 22;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#2563eb' : '#0f172a';
        ctx.lineWidth = isSelected ? 2.5 : 2;
        ctx.stroke();

        // Router cross arrows
        ctx.strokeStyle = isSelected ? '#2563eb' : '#334155';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y + 10);
        ctx.stroke();

        ctx.fillStyle = isSelected ? '#2563eb' : '#334155';
        ctx.beginPath();
        ctx.arc(x - 10, y, 2, 0, Math.PI * 2);
        ctx.arc(x + 10, y, 2, 0, Math.PI * 2);
        ctx.arc(x, y - 10, 2, 0, Math.PI * 2);
        ctx.arc(x, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    draw5gTower(ctx, x, y, isSelected) {
        ctx.strokeStyle = isSelected ? '#2563eb' : '#d97706';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x - 10, y + 16);
        ctx.lineTo(x, y - 16);
        ctx.lineTo(x + 10, y + 16);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 6, y + 4);
        ctx.lineTo(x + 6, y + 4);
        ctx.stroke();

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(x, y - 16, 3.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawMobileDevice(ctx, x, y, isSelected) {
        const w = 20;
        const h = 34;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeStyle = isSelected ? '#2563eb' : '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);

        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x - w / 2 + 2, y - h / 2 + 3, w - 4, h - 9);
    }

    drawWorkstation(ctx, x, y, isSelected) {
        const w = 30;
        const h = 22;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w / 2, y - h / 2 - 3, w, h);
        ctx.strokeStyle = isSelected ? '#2563eb' : '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - w / 2, y - h / 2 - 3, w, h);

        ctx.fillStyle = '#ecfdf5';
        ctx.fillRect(x - w / 2 + 2, y - h / 2 - 1, w - 4, h - 4);

        // Stand
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x - 3, y + h / 2 - 3, 6, 5);
        ctx.fillRect(x - 10, y + h / 2 + 2, 20, 2);
    }

    drawBuffer(ctx, buffer) {
        const b = this.nodes.buffer;
        const isHovered = this.hoveredItem && this.hoveredItem.type === 'buffer';
        const isSelected = this.selectedItem && this.selectedItem.type === 'buffer';

        ctx.fillStyle = isHovered || isSelected ? '#eff6ff' : '#ffffff';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeStyle = isSelected ? '#2563eb' : '#cbd5e1';
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Fill ratio
        const fillRatio = Math.min(1.0, buffer.getFillRatio());
        const fillW = b.w * fillRatio;
        ctx.fillStyle = fillRatio > 0.8 ? '#fecdd3' : '#bfdbfe';
        ctx.fillRect(b.x, b.y, fillW, b.h);

        // Slot divisions
        const slotWidth = b.w / buffer.maxPackets;
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 1; i < buffer.maxPackets; i++) {
            const sx = b.x + i * slotWidth;
            ctx.beginPath();
            ctx.moveTo(sx, b.y);
            ctx.lineTo(sx, b.y + b.h);
            ctx.stroke();
        }

        ctx.fillStyle = '#334155';
        ctx.font = '600 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `Queue: ${buffer.getOccupancy()}/${buffer.maxPackets} pkts (${buffer.getQueuingDelayMs().toFixed(1)}ms delay)`,
            b.x + b.w / 2,
            b.y + b.h + 13
        );
    }

    drawPackets(ctx, sim) {
        this.currentRenderedPackets = [];
        const n = this.nodes;
        const cy = this.height / 2 - 12;
        const w = this.width;

        // Forward Packets
        for (const pkt of sim.packetsInFlight) {
            let px, py;
            const prog = pkt.progress;

            const xStart = n.sender ? n.sender.x : n.sender1.x;
            const xMid1 = n.router1 ? n.router1.x : w * 0.38;
            const xMid2 = n.router2 ? n.router2.x : (n.baseStation ? n.baseStation.x : w * 0.62);
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

            ctx.fillStyle = pkt.isDropped ? '#dc2626' : (pkt.isRetransmission ? '#d97706' : '#2563eb');
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${pkt.seq}`, px, py - 8);
        }

        // Return ACKs
        for (const ack of sim.acksInFlight) {
            const p = ack.progress;
            const xEnd = n.receiver ? n.receiver.x : n.receiver1.x;
            const xStart = n.sender ? n.sender.x : n.sender1.x;

            const p0x = xEnd;
            const p0y = cy + 30;
            const p1x = this.width / 2;
            const p1y = cy + 75;
            const p2x = xStart;
            const p2y = cy + 30;

            const t = p;
            const px = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
            const py = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;

            this.currentRenderedPackets.push({ screenX: px, screenY: py, packet: ack });

            ctx.fillStyle = ack.isDupAck ? '#e11d48' : '#059669';
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = ack.isDupAck ? '#be123c' : '#047857';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ack.isDupAck ? `DUP#${ack.dupCount}` : `ACK`, px, py + 11);
        }
    }
}
