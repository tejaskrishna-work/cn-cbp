/**
 * Main Web Application Coordinator
 * Connects simulation engine, canvas visualizers, charts, UI sliders,
 * keyword tooltips, live step-by-step narrator, and dynamic model comparison.
 */

import { NetworkSimulator } from './engine/simulator.js';
import { TopologyCanvas } from './visualizer/topology_canvas.js';
import { ChartRenderer } from './visualizer/chart_renderer.js';
import { UnderTheHoodInspector } from './visualizer/under_the_hood.js';
import { EDUCATIONAL_SCENARIOS } from './data/educational_scenarios.js';
import { Ns3TraceLoader } from './data/ns3_trace_loader.js';
import { GLOSSARY } from './data/glossary.js';
import { VIVA_QUESTIONS } from './data/viva_questions.js';

class App {
    constructor() {
        this.sim = new NetworkSimulator();

        // DOM Elements
        this.elements = {
            selectTopology: document.getElementById('select-topology'),
            topologyTitle: document.getElementById('topology-title'),
            selectAlgorithm: document.getElementById('select-algorithm'),
            selectScenario: document.getElementById('select-scenario'),
            btnPlay: document.getElementById('btn-play'),
            btnStep: document.getElementById('btn-step'),
            btnReset: document.getElementById('btn-reset'),
            sliderSpeed: document.getElementById('slider-speed'),
            labelSpeed: document.getElementById('label-speed'),
            paramBw: document.getElementById('param-bw'),
            valBw: document.getElementById('val-bw'),
            paramDelay: document.getElementById('param-delay'),
            valDelay: document.getElementById('val-delay'),
            paramLoss: document.getElementById('param-loss'),
            valLoss: document.getElementById('val-loss'),
            paramQueue: document.getElementById('param-queue'),
            valQueue: document.getElementById('val-queue'),
            metricThroughput: document.getElementById('metric-throughput'),
            metricAvgThroughput: document.getElementById('metric-avg-throughput'),
            metricCwnd: document.getElementById('metric-cwnd'),
            metricSsthresh: document.getElementById('metric-ssthresh'),
            metricQdelay: document.getElementById('metric-qdelay'),
            metricBdp: document.getElementById('metric-bdp'),
            metricDrops: document.getElementById('metric-drops'),
            topologyCanvas: document.getElementById('topology-canvas'),
            chartCanvas: document.getElementById('chart-canvas'),
            inspectorPanel: document.getElementById('under-the-hood-panel'),
            eventLogStream: document.getElementById('event-log-stream'),
            fileNs3Trace: document.getElementById('file-ns3-trace'),
            tabBtns: document.querySelectorAll('.tab-btn'),
            // Narrator Elements
            narratorPhaseBadge: document.getElementById('narrator-phase-badge'),
            narratorClock: document.getElementById('narrator-clock'),
            narratorStep1: document.getElementById('narrator-step-1'),
            narratorStep2: document.getElementById('narrator-step-2'),
            narratorStep3: document.getElementById('narrator-step-3'),
            narratorStep4: document.getElementById('narrator-step-4'),
            // Dynamic Model Comparison Elements
            diagTitle: document.getElementById('diag-title'),
            diagDesc: document.getElementById('diag-desc'),
            diagBadge: document.getElementById('diag-badge'),
            scoreTahoe: document.getElementById('score-tahoe'),
            scoreReno: document.getElementById('score-reno'),
            scoreNewreno: document.getElementById('score-newreno'),
            scoreCubic: document.getElementById('score-cubic'),
            cardTahoe: document.getElementById('card-tahoe'),
            cardReno: document.getElementById('card-reno'),
            cardNewreno: document.getElementById('card-newreno'),
            cardCubic: document.getElementById('card-cubic'),
            btnOpenViva: document.getElementById('btn-open-viva'),
            // Tooltip Card
            tooltipCard: document.getElementById('keyword-tooltip-card'),
            ttTitle: document.getElementById('tt-title'),
            ttFormula: document.getElementById('tt-formula'),
            ttDef: document.getElementById('tt-def'),
            ttContext: document.getElementById('tt-context')
        };

        // Initialize Visualizers
        this.topologyCanvas = new TopologyCanvas(
            this.elements.topologyCanvas,
            (target) => this.onInspectTarget(target)
        );

        this.chartRenderer = new ChartRenderer(
            this.elements.chartCanvas,
            (point) => this.onInspectChartPoint(point)
        );

        this.inspector = new UnderTheHoodInspector(this.elements.inspectorPanel);

        // Bind Simulator Events
        this.sim.onEvent = (evt) => this.appendLogEntry(evt);

        // State
        this.lastFrameTime = performance.now();
        this.animationFrameId = null;

        // Initial setup
        this.bindEvents();
        this.bindTooltipEvents();
        this.updateModelComparison();
        this.inspector.inspect({ type: 'node', id: 'sender' }, this.sim);
        this.renderFrame();
    }

    bindEvents() {
        // Topology Change
        this.elements.selectTopology.addEventListener('change', (e) => {
            const topo = e.target.value;
            this.topologyCanvas.setTopology(topo);
            const titleMap = {
                dumbbell: 'Standard Bottleneck Dumbbell',
                multiflow: 'Dual-Flow Cross Traffic (Fairness Benchmark)',
                wireless: '5G / Wireless Last-Mile (Fading Loss)',
                multihop: 'Multi-Hop Backbone (3-Router Cascade)'
            };
            this.elements.topologyTitle.textContent = titleMap[topo] || 'Network Topology';
            this.appendLogEntry({ time: this.sim.currentTime, type: 'INFO', description: `Switched topology to: ${titleMap[topo]}` });
            this.renderFrame();
        });

        // Play / Pause Toggle
        this.elements.btnPlay.addEventListener('click', () => {
            if (this.sim.isRunning) {
                this.pause();
            } else {
                this.play();
            }
        });

        // Step 0.05s
        this.elements.btnStep.addEventListener('click', () => {
            this.pause();
            this.sim.step(0.05);
            this.renderFrame();
            this.updateNarrator();
        });

        // Reset
        this.elements.btnReset.addEventListener('click', () => {
            this.pause();
            this.sim.reset();
            this.inspector.inspect({ type: 'node', id: 'sender' }, this.sim);
            this.renderFrame();
            this.updateNarrator();
            this.appendLogEntry({ time: 0, type: 'INFO', description: 'Simulation reset to t = 0.0s' });
        });

        // Algorithm Switch
        this.elements.selectAlgorithm.addEventListener('change', (e) => {
            const variant = e.target.value;
            this.sim.setVariant(variant);
            this.inspector.inspect({ type: 'node', id: 'sender' }, this.sim);
            this.updateModelComparison();
            this.renderFrame();
        });

        // Scenario Presets
        this.elements.selectScenario.addEventListener('change', (e) => {
            this.loadScenario(e.target.value);
        });

        // Speed Slider (extended range: 0.05x to 2.0x)
        if (this.elements.btnOpenViva) {
            this.elements.btnOpenViva.addEventListener('click', () => {
                this.openVivaQuiz();
            });
        }

        this.elements.sliderSpeed.addEventListener('input', (e) => {
            const spd = parseFloat(e.target.value);
            this.sim.params.simSpeed = spd;
            this.elements.labelSpeed.textContent = `${spd.toFixed(2)}x`;
        });

        // Parameter Sliders with Live Guidance Update
        this.elements.paramBw.addEventListener('input', (e) => {
            const bw = parseFloat(e.target.value);
            this.sim.updateParams({ bandwidthMbps: bw });
            this.elements.valBw.textContent = `${bw.toFixed(1)} Mbps`;
            this.updateModelComparison();
        });

        this.elements.paramDelay.addEventListener('input', (e) => {
            const delay = parseFloat(e.target.value);
            this.sim.updateParams({ propagationDelayMs: delay });
            this.elements.valDelay.textContent = `${delay.toFixed(1)} ms`;
            this.updateModelComparison();
        });

        this.elements.paramLoss.addEventListener('input', (e) => {
            const lossPct = parseFloat(e.target.value);
            this.sim.updateParams({ packetLossRate: lossPct / 100.0 });
            this.elements.valLoss.textContent = `${lossPct.toFixed(1)}%`;
            this.updateModelComparison();
        });

        this.elements.paramQueue.addEventListener('input', (e) => {
            const q = parseInt(e.target.value, 10);
            this.sim.updateParams({ queueCapacity: q });
            this.elements.valQueue.textContent = `${q} pkts`;
            this.updateModelComparison();
        });

        // Chart Tabs
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chartRenderer.setMode(btn.dataset.mode);
                this.chartRenderer.render(this.sim.history);
            });
        });

        // NS-3 Trace File Import
        this.elements.fileNs3Trace.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const content = evt.target.result;
                try {
                    if (file.name.endsWith('.json')) {
                        const parsedJson = JSON.parse(content);
                        this.loadJsonTrace(parsedJson);
                    } else {
                        const cwndPoints = Ns3TraceLoader.parseCwndData(content);
                        this.sim.history.cwnd = cwndPoints;
                        this.chartRenderer.render(this.sim.history);
                        this.appendLogEntry({ time: 0, type: 'INFO', description: `Loaded NS-3 text trace: ${file.name} (${cwndPoints.length} points)` });
                    }
                } catch (err) {
                    alert('Error parsing NS-3 trace file: ' + err.message);
                }
            };
            reader.readAsText(file);
        });
    }

    bindTooltipEvents() {
        const tooltipCard = this.elements.tooltipCard;
        const ttTitle = this.elements.ttTitle;
        const ttFormula = this.elements.ttFormula;
        const ttDef = this.elements.ttDef;
        const ttContext = this.elements.ttContext;

        document.querySelectorAll('.has-tooltip').forEach(el => {
            el.addEventListener('mouseenter', (e) => {
                const termKey = el.dataset.term;
                const info = GLOSSARY[termKey];
                if (!info) return;

                ttTitle.textContent = info.title;
                ttFormula.textContent = info.formula || '';
                ttDef.textContent = info.definition;
                ttContext.textContent = info.context || '';

                tooltipCard.style.display = 'block';
                this.positionTooltip(e);
            });

            el.addEventListener('mousemove', (e) => {
                this.positionTooltip(e);
            });

            el.addEventListener('mouseleave', () => {
                tooltipCard.style.display = 'none';
            });
        });
    }

    positionTooltip(e) {
        const tooltipCard = this.elements.tooltipCard;
        const margin = 16;
        let x = e.clientX + margin;
        let y = e.clientY + margin;

        const rect = tooltipCard.getBoundingClientRect();
        if (x + 320 > window.innerWidth) {
            x = e.clientX - 330;
        }
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - 10;
        }

        tooltipCard.style.left = `${Math.max(10, x)}px`;
        tooltipCard.style.top = `${Math.max(10, y)}px`;
    }

    play() {
        this.sim.isRunning = true;
        this.elements.btnPlay.textContent = '⏸ Pause';
        this.elements.btnPlay.classList.remove('btn-primary');
        this.elements.btnPlay.classList.add('btn-action');
        this.lastFrameTime = performance.now();
        this.loop();
    }

    pause() {
        this.sim.isRunning = false;
        this.elements.btnPlay.textContent = '▶ Start Simulation';
        this.elements.btnPlay.classList.remove('btn-action');
        this.elements.btnPlay.classList.add('btn-primary');
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    loop() {
        if (!this.sim.isRunning) return;

        const now = performance.now();
        const deltaSec = Math.min(0.05, (now - this.lastFrameTime) / 1000.0);
        this.lastFrameTime = now;

        this.sim.step(deltaSec);
        this.renderFrame();
        this.updateNarrator();

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    renderFrame() {
        this.topologyCanvas.render(this.sim);
        this.chartRenderer.render(this.sim.history);
        this.updateMetricsDisplay();
    }

    updateMetricsDisplay() {
        const stats = this.sim.stats;
        const agent = this.sim.tcpAgent;
        const buf = this.sim.buffer;

        const bdpPkts = (this.sim.params.bandwidthMbps * 1e6 / 8.0 * (agent.srtt || 0.044) / agent.mss).toFixed(1);

        this.elements.metricThroughput.textContent = `${stats.currentThroughputMbps.toFixed(2)} Mbps`;
        this.elements.metricAvgThroughput.textContent = `${stats.avgThroughputMbps.toFixed(2)} Mbps`;
        this.elements.metricCwnd.textContent = `${agent.cwnd.toFixed(2)} MSS`;
        this.elements.metricSsthresh.textContent = `${agent.ssthresh.toFixed(1)} MSS`;
        this.elements.metricQdelay.textContent = `${buf.getQueuingDelayMs(agent.mss).toFixed(1)} ms`;
        this.elements.metricBdp.textContent = `${bdpPkts} pkts`;
        this.elements.metricDrops.textContent = `${stats.totalDroppedPackets}`;
    }

    updateNarrator() {
        const agent = this.sim.tcpAgent;
        const buf = this.sim.buffer;
        const t = this.sim.currentTime.toFixed(3);
        const inFlight = ((this.sim.nextSeqNumber - this.sim.expectedAckNumber) / agent.mss).toFixed(1);

        // Update Header Badge & Clock
        this.elements.narratorPhaseBadge.textContent = agent.state.replace('_', ' ');
        this.elements.narratorClock.textContent = `t = ${t}s`;

        // Step 1: Window Transmission
        this.elements.narratorStep1.textContent = 
            `Sender window allows ${Math.floor(agent.cwnd)} MSS. In-flight: ${inFlight} MSS. Next Seq #${this.sim.nextSeqNumber}.`;

        // Step 2: Queue Dynamics
        const qOcc = buf.getOccupancy();
        const qMax = buf.maxPackets;
        const qDelay = buf.getQueuingDelayMs(agent.mss).toFixed(1);
        this.elements.narratorStep2.textContent = 
            `Queue holds ${qOcc}/${qMax} pkts (${(qOcc/qMax*100).toFixed(0)}% full). Bottleneck queuing delay: ${qDelay}ms.`;

        // Step 3: Receiver Acknowledgments
        if (agent.dupAckCount > 0) {
            this.elements.narratorStep3.innerHTML = 
                `<span style="color: #ec4899; font-weight: bold;">Gap detected! Received Dup ACK #${agent.dupAckCount} requesting missing Seq #${this.sim.expectedAckNumber}.</span>`;
        } else {
            this.elements.narratorStep3.textContent = 
                `In-order stream confirmed. Cumulative ACK #${this.sim.expectedAckNumber} delivered to sender.`;
        }

        // Step 4: Algorithm State Decision
        this.elements.narratorStep4.innerHTML = 
            `<strong>${agent.variant} Rule:</strong> ${agent.lastEventReason}`;
    }

    updateModelComparison() {
        const p = this.sim.params;
        const rttMs = p.propagationDelayMs * 2 + 4;
        const lossPct = p.packetLossRate * 100;
        const bdp = (p.bandwidthMbps * 1e6 / 8.0 * (rttMs / 1000.0) / 1460);

        // Environmental Diagnosis
        if (rttMs >= 80) {
            this.elements.diagTitle.textContent = "Current Environment: Long Fat Network (LFN / Satellite)";
            this.elements.diagDesc.textContent = `High RTT (${rttMs.toFixed(0)}ms) and high BDP (${bdp.toFixed(0)} pkts). Standard Reno AIMD climbs too slowly (+1 MSS/RTT).`;
            this.elements.diagBadge.textContent = "RECOMMENDED: TCP CUBIC";
            this.elements.diagBadge.style.background = "#0284c7";
            this.elements.scoreCubic.textContent = "Suitability: Optimal (10/10)";
            this.elements.scoreNewreno.textContent = "Suitability: Moderate (5/10)";
            this.elements.scoreReno.textContent = "Suitability: Poor (4/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Critical (2/10)";
        } else if (lossPct >= 2.0) {
            this.elements.diagTitle.textContent = "Current Environment: High-Loss Channel (Wireless / Congested)";
            this.elements.diagDesc.textContent = `Packet loss rate is elevated (${lossPct.toFixed(1)}%). Frequent packet drops require aggressive Fast Recovery and Partial ACK handling.`;
            this.elements.diagBadge.textContent = "RECOMMENDED: CUBIC or NEWRENO";
            this.elements.diagBadge.style.background = "#10b981";
            this.elements.scoreCubic.textContent = "Suitability: High (9/10)";
            this.elements.scoreNewreno.textContent = "Suitability: High (8/10)";
            this.elements.scoreReno.textContent = "Suitability: Moderate (5/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Poor (3/10)";
        } else if (p.queueCapacity >= 75) {
            this.elements.diagTitle.textContent = "Current Environment: Bufferbloat Vulnerability Zone";
            this.elements.diagDesc.textContent = `Router buffer capacity (${p.queueCapacity} pkts) significantly exceeds BDP (${bdp.toFixed(0)} pkts). Queuing delay will inflate severely.`;
            this.elements.diagBadge.textContent = "RECOMMENDED: CUBIC (with RED/CoDel)";
            this.elements.diagBadge.style.background = "#a855f7";
            this.elements.scoreCubic.textContent = "Suitability: Moderate (7/10)";
            this.elements.scoreNewreno.textContent = "Suitability: Moderate (6/10)";
            this.elements.scoreReno.textContent = "Suitability: Moderate (6/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Poor (4/10)";
        } else {
            this.elements.diagTitle.textContent = "Current Environment: Well-Balanced Low-Latency Network";
            this.elements.diagDesc.textContent = `Standard RTT (${rttMs.toFixed(0)}ms) with low loss (${lossPct.toFixed(1)}%). Reno and Cubic both perform reliably.`;
            this.elements.diagBadge.textContent = "RECOMMENDED: TCP CUBIC / RENO";
            this.elements.diagBadge.style.background = "#0284c7";
            this.elements.scoreCubic.textContent = "Suitability: Optimal (10/10)";
            this.elements.scoreNewreno.textContent = "Suitability: High (9/10)";
            this.elements.scoreReno.textContent = "Suitability: High (8/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Moderate (5/10)";
        }

        // Highlight active algorithm card
        const v = this.sim.params.variant;
        [this.elements.cardTahoe, this.elements.cardReno, this.elements.cardNewreno, this.elements.cardCubic].forEach(c => c.classList.remove('featured'));
        if (v === 'TcpTahoe') this.elements.cardTahoe.classList.add('featured');
        else if (v === 'TcpReno') this.elements.cardReno.classList.add('featured');
        else if (v === 'TcpNewReno') this.elements.cardNewreno.classList.add('featured');
        else this.elements.cardCubic.classList.add('featured');
    }

    onInspectTarget(target) {
        this.inspector.inspect(target, this.sim);
    }

    onInspectChartPoint(point) {
        this.pause();
        this.inspector.inspect(point, this.sim);
    }

    openVivaQuiz() {
        this.pause();
        this.elements.inspectorPanel.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge badge-chart">Interactive Oral Examination</span>
                    <h3>🎓 Computer Networks Viva Quiz</h3>
                </div>
                <div class="uth-rfc">High-Yield Questions & Answers</div>
            </div>
            <div id="quiz-container" style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
                ${VIVA_QUESTIONS.map((q, idx) => `
                    <div class="viva-question-card" style="background: #080d1a; border: 1px solid #1a253d; border-radius: 8px; padding: 12px;">
                        <div style="font-weight: 600; font-size: 0.82rem; margin-bottom: 8px; color: #f8fafc;">
                            Q${idx + 1}: ${q.question}
                        </div>
                        <div class="viva-options" style="display: flex; flex-direction: column; gap: 6px;">
                            ${q.options.map((opt, oIdx) => `
                                <button class="viva-opt-btn" data-qid="${q.id}" data-oidx="${oIdx}" style="text-align: left; background: #151e34; border: 1px solid #243254; color: #94a3b8; padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; transition: all 0.2s;">
                                    ${String.fromCharCode(65 + oIdx)}. ${opt}
                                </button>
                            `).join('')}
                        </div>
                        <div class="viva-feedback" id="feedback-q${q.id}" style="display: none; margin-top: 8px; font-size: 0.75rem; padding: 6px 8px; border-radius: 4px;"></div>
                    </div>
                `).join('')}
            </div>
        `;

        document.querySelectorAll('.viva-opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const qid = parseInt(btn.dataset.qid);
                const chosen = parseInt(btn.dataset.oidx);
                const question = VIVA_QUESTIONS.find(item => item.id === qid);
                const feedbackEl = document.getElementById(`feedback-q${qid}`);
                
                const parent = btn.parentElement;
                parent.querySelectorAll('.viva-opt-btn').forEach(b => {
                    b.disabled = true;
                    b.style.cursor = 'default';
                });

                if (chosen === question.correct) {
                    btn.style.background = 'rgba(16, 185, 129, 0.2)';
                    btn.style.borderColor = '#10b981';
                    btn.style.color = '#34d399';
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = 'rgba(16, 185, 129, 0.1)';
                    feedbackEl.style.color = '#34d399';
                    feedbackEl.innerHTML = `<strong>✔ Correct!</strong> ${question.explanation}`;
                } else {
                    btn.style.background = 'rgba(244, 63, 94, 0.2)';
                    btn.style.borderColor = '#f43f5e';
                    btn.style.color = '#f87171';
                    feedbackEl.style.display = 'block';
                    feedbackEl.style.background = 'rgba(244, 63, 94, 0.1)';
                    feedbackEl.style.color = '#f87171';
                    feedbackEl.innerHTML = `<strong>✖ Incorrect.</strong> Correct answer is <strong>${String.fromCharCode(65 + question.correct)}</strong>: ${question.explanation}`;
                }
            });
        });
    }

    loadScenario(scenarioId) {
        if (scenarioId === 'custom') return;
        const scen = EDUCATIONAL_SCENARIOS.find(s => s.id === scenarioId);
        if (!scen) return;

        this.pause();
        this.sim.reset();

        this.elements.selectAlgorithm.value = scen.config.variant;
        this.sim.setVariant(scen.config.variant);

        this.elements.paramBw.value = scen.config.bandwidthMbps;
        this.elements.valBw.textContent = `${scen.config.bandwidthMbps.toFixed(1)} Mbps`;

        this.elements.paramDelay.value = scen.config.propagationDelayMs;
        this.elements.valDelay.textContent = `${scen.config.propagationDelayMs.toFixed(1)} ms`;

        this.elements.paramLoss.value = (scen.config.packetLossRate * 100).toFixed(1);
        this.elements.valLoss.textContent = `${(scen.config.packetLossRate * 100).toFixed(1)}%`;

        this.elements.paramQueue.value = scen.config.queueCapacity;
        this.elements.valQueue.textContent = `${scen.config.queueCapacity} pkts`;

        this.elements.sliderSpeed.value = scen.config.simSpeed;
        this.elements.labelSpeed.textContent = `${scen.config.simSpeed.toFixed(2)}x`;

        this.sim.updateParams({
            bandwidthMbps: scen.config.bandwidthMbps,
            propagationDelayMs: scen.config.propagationDelayMs,
            packetLossRate: scen.config.packetLossRate,
            queueCapacity: scen.config.queueCapacity,
            simSpeed: scen.config.simSpeed
        });

        this.updateModelComparison();

        this.elements.inspectorPanel.innerHTML = `
            <div class="uth-header">
                <div class="uth-title">
                    <span class="badge badge-chart">Guided Educational Mission</span>
                    <h3>${scen.title}</h3>
                </div>
                <div class="uth-rfc">${scen.subtitle}</div>
            </div>

            <div class="uth-section">
                <h4>Mission Briefing</h4>
                <div class="educational-note">
                    <p>${scen.description}</p>
                </div>
            </div>

            <div class="uth-section">
                <h4>What to Watch For ("Under The Hood")</h4>
                <ul style="padding-left: 20px; font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px;">
                    ${scen.learningPoints.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>

            <div style="margin-top: 16px;">
                <button id="btn-start-mission" class="btn-action btn-primary" style="width: 100%;">🚀 Launch Scenario</button>
            </div>
        `;

        document.getElementById('btn-start-mission').addEventListener('click', () => {
            this.play();
        });

        this.renderFrame();
        this.updateNarrator();
        this.appendLogEntry({ time: 0, type: 'INFO', description: `Loaded Guided Scenario: ${scen.title}` });
    }

    loadJsonTrace(data) {
        if (!data || !data.cwnd) return;
        this.pause();
        this.sim.history.cwnd = data.cwnd.map(pt => ({
            time: pt.time,
            cwnd: pt.cwnd_mss,
            ssthresh: pt.ssthresh_mss,
            state: pt.state,
            formula: pt.explanation,
            reason: pt.explanation
        }));
        if (data.throughput) {
            this.sim.history.throughput = data.throughput.map(pt => ({
                time: pt.time,
                throughput: pt.throughput_mbps
            }));
        }
        if (data.queue) {
            this.sim.history.queue = data.queue.map(pt => ({
                time: pt.time,
                queueSize: pt.queue_pkts,
                maxQueue: pt.max_queue
            }));
        }

        this.chartRenderer.render(this.sim.history);
        this.appendLogEntry({
            time: 0,
            type: 'INFO',
            description: `Loaded NS-3 dataset for ${data.metadata.variant} (Throughput: ${data.metadata.avg_throughput_mbps} Mbps, Drops: ${data.metadata.total_drops})`
        });
    }

    appendLogEntry(entry) {
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `
            <span class="log-time">[${entry.time.toFixed(3)}s]</span>
            <span class="log-${entry.type}">${entry.description}</span>
        `;
        this.elements.eventLogStream.prepend(div);

        while (this.elements.eventLogStream.children.length > 40) {
            this.elements.eventLogStream.removeChild(this.elements.eventLogStream.lastChild);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
