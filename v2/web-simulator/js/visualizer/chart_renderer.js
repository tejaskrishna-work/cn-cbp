/**
 * Interactive Real-Time Chart Renderer - Version 2.0 (Clean Academic Theme)
 * Visualizes CWND & ssthresh, Throughput, and Queue Occupancy.
 * Supports hover tooltips and click-to-inspect on any graph inflection point!
 */

export class ChartRenderer {
    constructor(canvasElement, onSelectPoint) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.onSelectPoint = onSelectPoint;

        this.hoveredPoint = null;
        this.selectedPoint = null;
        this.currentMode = 'CWND'; // 'CWND', 'THROUGHPUT', 'QUEUE'

        this.initCanvasSize();
        window.addEventListener('resize', () => this.initCanvasSize());

        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoveredPoint = null; });
    }

    initCanvasSize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width || 900;
        this.height = rect.height || 230;
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    setMode(mode) {
        this.currentMode = mode;
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
        this.hoveredPoint = this.findNearestPoint(pos.x, pos.y);
        this.canvas.style.cursor = this.hoveredPoint ? 'crosshair' : 'default';
    }

    handleClick(e) {
        const pos = this.getMousePos(e);
        const hit = this.findNearestPoint(pos.x, pos.y);
        if (hit && this.onSelectPoint) {
            this.selectedPoint = hit.data;
            this.onSelectPoint(hit.data);
        }
    }

    findNearestPoint(mouseX, mouseY) {
        if (!this.renderedPoints || this.renderedPoints.length === 0) return null;
        let closest = null;
        let minDistance = 25;

        for (const pt of this.renderedPoints) {
            const dist = Math.hypot(pt.x - mouseX, pt.y - mouseY);
            if (dist < minDistance) {
                minDistance = dist;
                closest = pt;
            }
        }
        return closest;
    }

    render(history) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        this.renderedPoints = [];

        // White canvas background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.width, this.height);

        const padding = { top: 25, right: 30, bottom: 32, left: 55 };
        const chartW = this.width - padding.left - padding.right;
        const chartH = this.height - padding.top - padding.bottom;

        // Draw Axes & Gridlines
        this.drawGrid(ctx, padding, chartW, chartH);

        if (!history || !history.cwnd || history.cwnd.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Simulation warming up... collecting metric traces.', this.width / 2, this.height / 2);
            return;
        }

        if (this.currentMode === 'CWND') {
            this.renderCwndChart(ctx, history.cwnd, padding, chartW, chartH);
        } else if (this.currentMode === 'THROUGHPUT') {
            this.renderThroughputChart(ctx, history.throughput, padding, chartW, chartH);
        } else if (this.currentMode === 'QUEUE') {
            this.renderQueueChart(ctx, history.queue, padding, chartW, chartH);
        }

        // Draw Hover Tooltip if active
        if (this.hoveredPoint) {
            this.drawTooltip(ctx, this.hoveredPoint, padding);
        }
    }

    drawGrid(ctx, p, w, h) {
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;

        // Horizontal Gridlines
        for (let i = 0; i <= 4; i++) {
            const y = p.top + (h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(p.left, y);
            ctx.lineTo(p.left + w, y);
            ctx.stroke();
        }

        // Vertical Gridlines
        for (let i = 0; i <= 6; i++) {
            const x = p.left + (w / 6) * i;
            ctx.beginPath();
            ctx.moveTo(x, p.top);
            ctx.lineTo(x, p.top + h);
            ctx.stroke();
        }
    }

    renderCwndChart(ctx, data, p, w, h) {
        const maxVal = Math.max(20, ...data.map(d => Math.max(d.cwnd, d.ssthresh || 0))) * 1.15;
        const minTime = data[0].time;
        const maxTime = Math.max(minTime + 1.0, data[data.length - 1].time);
        const timeRange = maxTime - minTime;

        // Y-Axis labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = ((maxVal / 4) * (4 - i)).toFixed(0);
            const y = p.top + (h / 4) * i;
            ctx.fillText(`${val} MSS`, p.left - 8, y + 3);
        }

        // X-Axis labels
        ctx.textAlign = 'center';
        for (let i = 0; i <= 6; i++) {
            const t = (minTime + (timeRange / 6) * i).toFixed(1);
            const x = p.left + (w / 6) * i;
            ctx.fillText(`${t}s`, x, p.top + h + 16);
        }

        // ssthresh line (dashed amber)
        ctx.strokeStyle = '#d97706';
        ctx.setLineDash([5, 4]);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        let firstSsthresh = true;
        for (const pt of data) {
            const x = p.left + ((pt.time - minTime) / timeRange) * w;
            const y = p.top + h - (pt.ssthresh / maxVal) * h;
            if (firstSsthresh) { ctx.moveTo(x, y); firstSsthresh = false; }
            else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // cwnd line (cobalt blue)
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        let firstCwnd = true;
        for (const pt of data) {
            const x = p.left + ((pt.time - minTime) / timeRange) * w;
            const y = p.top + h - (pt.cwnd / maxVal) * h;

            this.renderedPoints.push({ x, y, data: pt });

            if (firstCwnd) { ctx.moveTo(x, y); firstCwnd = false; }
            else { ctx.lineTo(x, y); }
        }
        ctx.stroke();

        // Selected point marker
        if (this.selectedPoint) {
            const x = p.left + ((this.selectedPoint.time - minTime) / timeRange) * w;
            const y = p.top + h - (this.selectedPoint.cwnd / maxVal) * h;
            ctx.strokeStyle = '#e11d48';
            ctx.fillStyle = '#e11d48';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Legend
        ctx.textAlign = 'left';
        ctx.font = '600 11px sans-serif';
        ctx.fillStyle = '#2563eb';
        ctx.fillText('━ Congestion Window (cwnd)', p.left + 10, p.top - 8);
        ctx.fillStyle = '#d97706';
        ctx.fillText('┅ Slow Start Threshold (ssthresh)', p.left + 220, p.top - 8);
    }

    renderThroughputChart(ctx, data, p, w, h) {
        if (!data || data.length === 0) return;
        const maxVal = Math.max(10, ...data.map(d => d.throughput)) * 1.2;
        const minTime = data[0].time;
        const maxTime = Math.max(minTime + 1.0, data[data.length - 1].time);
        const timeRange = maxTime - minTime;

        // Y-Axis
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = ((maxVal / 4) * (4 - i)).toFixed(1);
            const y = p.top + (h / 4) * i;
            ctx.fillText(`${val} Mbps`, p.left - 8, y + 3);
        }

        // X-Axis
        ctx.textAlign = 'center';
        for (let i = 0; i <= 6; i++) {
            const t = (minTime + (timeRange / 6) * i).toFixed(1);
            const x = p.left + (w / 6) * i;
            ctx.fillText(`${t}s`, x, p.top + h + 16);
        }

        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        let first = true;
        for (const pt of data) {
            const x = p.left + ((pt.time - minTime) / timeRange) * w;
            const y = p.top + h - (pt.throughput / maxVal) * h;
            this.renderedPoints.push({ x, y, data: pt });
            if (first) { ctx.moveTo(x, y); first = false; }
            else { ctx.lineTo(x, y); }
        }
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = '600 11px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('━ Instantaneous Goodput (Mbps)', p.left + 10, p.top - 8);
    }

    renderQueueChart(ctx, data, p, w, h) {
        if (!data || data.length === 0) return;
        const maxQueue = data[0].maxQueue || 50;
        const minTime = data[0].time;
        const maxTime = Math.max(minTime + 1.0, data[data.length - 1].time);
        const timeRange = maxTime - minTime;

        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = ((maxQueue / 4) * (4 - i)).toFixed(0);
            const y = p.top + (h / 4) * i;
            ctx.fillText(`${val} pkts`, p.left - 8, y + 3);
        }

        ctx.textAlign = 'center';
        for (let i = 0; i <= 6; i++) {
            const t = (minTime + (timeRange / 6) * i).toFixed(1);
            const x = p.left + (w / 6) * i;
            ctx.fillText(`${t}s`, x, p.top + h + 16);
        }

        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        let first = true;
        for (const pt of data) {
            const x = p.left + ((pt.time - minTime) / timeRange) * w;
            const y = p.top + h - (pt.queueSize / maxQueue) * h;
            this.renderedPoints.push({ x, y, data: pt });
            if (first) { ctx.moveTo(x, y); first = false; }
            else { ctx.lineTo(x, y); }
        }
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.font = '600 11px sans-serif';
        ctx.fillStyle = '#4f46e5';
        ctx.fillText('━ Router Queue Occupancy (Packets)', p.left + 10, p.top - 8);
    }

    drawTooltip(ctx, pt, p) {
        const d = pt.data;
        const boxW = 210;
        const boxH = 60;
        let bx = pt.x + 10;
        let by = pt.y - 65;

        if (bx + boxW > this.width) bx = pt.x - boxW - 10;
        if (by < p.top) by = pt.y + 10;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 1;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.fillStyle = '#0f172a';
        ctx.font = '600 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Time: ${d.time}s`, bx + 10, by + 16);

        if (d.cwnd !== undefined) {
            ctx.fillStyle = '#2563eb';
            ctx.fillText(`cwnd: ${d.cwnd} MSS | ssthresh: ${d.ssthresh}`, bx + 10, by + 32);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px monospace';
            ctx.fillText(`[${d.state}] (Click to inspect)`, bx + 10, by + 46);
        } else if (d.throughput !== undefined) {
            ctx.fillStyle = '#059669';
            ctx.fillText(`Goodput: ${d.throughput} Mbps`, bx + 10, by + 34);
        } else if (d.queueSize !== undefined) {
            ctx.fillStyle = '#4f46e5';
            ctx.fillText(`Queue: ${d.queueSize}/${d.maxQueue} packets`, bx + 10, by + 34);
        }
    }
}
