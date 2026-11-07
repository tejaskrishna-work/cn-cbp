/**
 * Main Web Application Coordinator - Version 2.0 (Clean Academic Theme)
 * Manages Tab Navigation (Manual, Simulator, Benchmark, Viva),
 * Preset Scenario Jumpers, Simulation Engine, Charts, and Tooltips.
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

        // Elements
        this.elements = {
            // Navigation
            navTabs: document.querySelectorAll('.nav-tab'),
            appViews: document.querySelectorAll('.app-view'),
            btnGotoSimulator: document.getElementById('btn-goto-simulator'),
            btnQuickScenario: document.getElementById('btn-quick-scenario'),
            // Guide Banner
            labGuideBanner: document.getElementById('lab-guide-banner'),
            guideBannerTitle: document.getElementById('guide-banner-title'),
            guideBannerDesc: document.getElementById('guide-banner-desc'),
            btnDismissGuide: document.getElementById('btn-dismiss-guide'),
            // Controls
            selectTopology: document.getElementById('select-topology'),
            topologyTitle: document.getElementById('topology-title'),
            selectAlgorithm: document.getElementById('select-algorithm'),
            btnPlay: document.getElementById('btn-play'),
            playIcon: document.getElementById('play-icon'),
            playText: document.getElementById('play-text'),
            btnStep: document.getElementById('btn-step'),
            btnReset: document.getElementById('btn-reset'),
            sliderSpeed: document.getElementById('slider-speed'),
            labelSpeed: document.getElementById('label-speed'),
            // Sliders
            paramBw: document.getElementById('param-bw'),
            valBw: document.getElementById('val-bw'),
            paramDelay: document.getElementById('param-delay'),
            valDelay: document.getElementById('val-delay'),
            paramLoss: document.getElementById('param-loss'),
            valLoss: document.getElementById('val-loss'),
            paramQueue: document.getElementById('param-queue'),
            valQueue: document.getElementById('val-queue'),
            // Metrics
            metricThroughput: document.getElementById('metric-throughput'),
            metricAvgThroughput: document.getElementById('metric-avg-throughput'),
            metricCwnd: document.getElementById('metric-cwnd'),
            metricSsthresh: document.getElementById('metric-ssthresh'),
            metricQdelay: document.getElementById('metric-qdelay'),
            metricBdp: document.getElementById('metric-bdp'),
            metricDrops: document.getElementById('metric-drops'),
            // Visualizers
            topologyCanvas: document.getElementById('topology-canvas'),
            chartCanvas: document.getElementById('chart-canvas'),
            inspectorOverlay: document.getElementById('inspector-overlay'),
            inspectorPanel: document.getElementById('under-the-hood-panel'),
            btnCloseInspector: document.getElementById('btn-close-inspector'),
            chartTabs: document.querySelectorAll('.btn-tab'),
            // Narrator
            narratorPhaseBadge: document.getElementById('narrator-phase-badge'),
            narratorClock: document.getElementById('narrator-clock'),
            narratorStep1: document.getElementById('narrator-step-1'),
            narratorStep2: document.getElementById('narrator-step-2'),
            narratorStep3: document.getElementById('narrator-step-3'),
            narratorStep4: document.getElementById('narrator-step-4'),
            // Diagnosis Banner
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
            // Viva Container
            vivaQuizContainer: document.getElementById('viva-quiz-container'),
            // Tooltip Card
            tooltipCard: document.getElementById('keyword-tooltip-card'),
            ttTitle: document.getElementById('tt-title'),
            ttFormula: document.getElementById('tt-formula'),
            ttDef: document.getElementById('tt-def'),
            ttContext: document.getElementById('tt-context')
        };

        // Visualizers
        this.topologyCanvas = new TopologyCanvas(
            this.elements.topologyCanvas,
            (target) => this.onInspectTarget(target)
        );

        this.chartRenderer = new ChartRenderer(
            this.elements.chartCanvas,
            (point) => this.onInspectChartPoint(point)
        );

        this.inspector = new UnderTheHoodInspector(this.elements.inspectorPanel);

        // State
        this.lastFrameTime = performance.now();
        this.animationFrameId = null;

        // Init
        this.bindNavigation();
        this.bindEvents();
        this.bindTooltipEvents();
        this.renderVivaQuestions();
        this.updateModelComparison();
        this.renderFrame();
    }

    bindNavigation() {
        // Tab switching
        this.elements.navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetViewId = `view-${tab.dataset.view}`;
                this.switchView(targetViewId, tab);
            });
        });

        // Launch Lab Buttons on Hero
        if (this.elements.btnGotoSimulator) {
            this.elements.btnGotoSimulator.addEventListener('click', () => {
                this.navigateToView('view-simulator');
            });
        }

        if (this.elements.btnQuickScenario) {
            this.elements.btnQuickScenario.addEventListener('click', () => {
                this.loadPresetScenario('fast_retransmit');
            });
        }

        // Scenario Cards on Manual Tab
        document.querySelectorAll('.scenario-card').forEach(card => {
            card.addEventListener('click', () => {
                const presetKey = card.dataset.preset;
                this.loadPresetScenario(presetKey);
            });
        });

        // Dismiss Guide Banner
        if (this.elements.btnDismissGuide) {
            this.elements.btnDismissGuide.addEventListener('click', () => {
                this.elements.labGuideBanner.style.display = 'none';
            });
        }

        // Inspector Overlay Close
        if (this.elements.btnCloseInspector) {
            this.elements.btnCloseInspector.addEventListener('click', () => {
                this.elements.inspectorOverlay.style.display = 'none';
            });
        }

        if (this.elements.inspectorOverlay) {
            this.elements.inspectorOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.inspectorOverlay) {
                    this.elements.inspectorOverlay.style.display = 'none';
                }
            });
        }
    }

    switchView(viewId, activeTabElement) {
        this.elements.navTabs.forEach(t => t.classList.remove('active'));
        this.elements.appViews.forEach(v => v.classList.remove('active'));

        if (activeTabElement) activeTabElement.classList.add('active');
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');

        // Re-size canvases if switching to simulator
        if (viewId === 'view-simulator') {
            setTimeout(() => {
                this.topologyCanvas.initCanvasSize();
                this.chartRenderer.initCanvasSize();
                this.renderFrame();
            }, 50);
        }
    }

    navigateToView(viewId) {
        const tabKey = viewId.replace('view-', '');
        const targetTab = document.querySelector(`.nav-tab[data-view="${tabKey}"]`);
        this.switchView(viewId, targetTab);
    }

    loadPresetScenario(scenarioId) {
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

        // Set Guide Banner Text
        this.elements.labGuideBanner.style.display = 'flex';
        this.elements.guideBannerTitle.textContent = `Guided Experiment: ${scen.title}`;
        this.elements.guideBannerDesc.textContent = `${scen.description} Press 'Start Simulation' to observe.`;

        this.navigateToView('view-simulator');
        this.updateModelComparison();
        this.renderFrame();
        this.updateNarrator();
    }

    bindEvents() {
        // Topology Change
        this.elements.selectTopology.addEventListener('change', (e) => {
            const topo = e.target.value;
            this.topologyCanvas.setTopology(topo);
            const titleMap = {
                dumbbell: 'Standard Bottleneck Dumbbell',
                multiflow: 'Dual-Flow Cross Traffic (TCP Fairness)',
                wireless: '5G Wireless Last-Mile (Fading Loss)',
                multihop: 'Multi-Hop Backbone (3-Router Cascade)'
            };
            this.elements.topologyTitle.textContent = titleMap[topo] || 'Network Topology';
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
            this.renderFrame();
            this.updateNarrator();
        });

        // Algorithm Switch
        this.elements.selectAlgorithm.addEventListener('change', (e) => {
            const variant = e.target.value;
            this.sim.setVariant(variant);
            this.updateModelComparison();
            this.renderFrame();
        });

        // Speed Slider
        this.elements.sliderSpeed.addEventListener('input', (e) => {
            const spd = parseFloat(e.target.value);
            this.sim.params.simSpeed = spd;
            this.elements.labelSpeed.textContent = `${spd.toFixed(2)}x`;
        });

        // Parameter Sliders
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

        // Chart Mode Tabs
        this.elements.chartTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.chartTabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.chartRenderer.setMode(btn.dataset.mode);
                this.chartRenderer.render(this.sim.history);
            });
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
        const margin = 14;
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
        this.elements.playIcon.textContent = '⏸';
        this.elements.playText.textContent = 'Pause';
        this.elements.btnPlay.classList.add('btn-secondary');
        this.elements.btnPlay.classList.remove('btn-primary');
        this.lastFrameTime = performance.now();
        this.loop();
    }

    pause() {
        this.sim.isRunning = false;
        this.elements.playIcon.textContent = '▶';
        this.elements.playText.textContent = 'Start Simulation';
        this.elements.btnPlay.classList.add('btn-primary');
        this.elements.btnPlay.classList.remove('btn-secondary');
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

        this.elements.metricThroughput.textContent = stats.currentThroughputMbps.toFixed(2);
        this.elements.metricAvgThroughput.textContent = stats.avgThroughputMbps.toFixed(2);
        this.elements.metricCwnd.textContent = agent.cwnd.toFixed(2);
        this.elements.metricSsthresh.textContent = agent.ssthresh.toFixed(1);
        this.elements.metricQdelay.textContent = buf.getQueuingDelayMs(agent.mss).toFixed(1);
        this.elements.metricBdp.textContent = bdpPkts;
        this.elements.metricDrops.textContent = stats.totalDroppedPackets;
    }

    updateNarrator() {
        const agent = this.sim.tcpAgent;
        const buf = this.sim.buffer;
        const t = this.sim.currentTime.toFixed(3);
        const inFlight = ((this.sim.nextSeqNumber - this.sim.expectedAckNumber) / agent.mss).toFixed(1);

        this.elements.narratorPhaseBadge.textContent = agent.state.replace('_', ' ');
        this.elements.narratorClock.textContent = `t = ${t}s`;

        this.elements.narratorStep1.textContent = 
            `Window allows ${Math.floor(agent.cwnd)} MSS. In-flight: ${inFlight} MSS. Next Seq #${this.sim.nextSeqNumber}.`;

        const qOcc = buf.getOccupancy();
        const qMax = buf.maxPackets;
        const qDelay = buf.getQueuingDelayMs(agent.mss).toFixed(1);
        this.elements.narratorStep2.textContent = 
            `Queue holds ${qOcc}/${qMax} pkts (${(qOcc/qMax*100).toFixed(0)}% full). Queuing delay: ${qDelay}ms.`;

        if (agent.dupAckCount > 0) {
            this.elements.narratorStep3.innerHTML = 
                `<span style="color: #e11d48; font-weight: 600;">Gap detected! Received Dup ACK #${agent.dupAckCount} for #${this.sim.expectedAckNumber}.</span>`;
        } else {
            this.elements.narratorStep3.textContent = 
                `In-order stream confirmed. Cumulative ACK #${this.sim.expectedAckNumber} delivered.`;
        }

        this.elements.narratorStep4.textContent = agent.lastEventReason;
    }

    updateModelComparison() {
        const p = this.sim.params;
        const rttMs = p.propagationDelayMs * 2 + 4;
        const lossPct = p.packetLossRate * 100;
        const bdp = (p.bandwidthMbps * 1e6 / 8.0 * (rttMs / 1000.0) / 1460);

        if (rttMs >= 80) {
            this.elements.diagTitle.textContent = "Current Environment: High-RTT Satellite Link (Long Fat Pipe)";
            this.elements.diagDesc.textContent = `High RTT (${rttMs.toFixed(0)}ms) and high BDP (${bdp.toFixed(0)} pkts). Standard Reno AIMD recovers too slowly (+1 MSS/RTT).`;
            this.elements.diagBadge.textContent = "RECOMMENDED: TCP CUBIC";
            this.elements.scoreCubic.textContent = "Suitability: Optimal (10/10)";
            this.elements.scoreNewreno.textContent = "Suitability: Moderate (5/10)";
            this.elements.scoreReno.textContent = "Suitability: Poor (4/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Critical (2/10)";
        } else if (lossPct >= 2.0) {
            this.elements.diagTitle.textContent = "Current Environment: High-Loss Channel (Wireless / Congested)";
            this.elements.diagDesc.textContent = `Loss rate is elevated (${lossPct.toFixed(1)}%). Frequent drops require Fast Recovery and Partial ACK handling.`;
            this.elements.diagBadge.textContent = "RECOMMENDED: CUBIC or NEWRENO";
            this.elements.scoreCubic.textContent = "Suitability: High (9/10)";
            this.elements.scoreNewreno.textContent = "Suitability: High (8/10)";
            this.elements.scoreReno.textContent = "Suitability: Moderate (5/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Poor (3/10)";
        } else if (p.queueCapacity >= 75) {
            this.elements.diagTitle.textContent = "Current Environment: Bufferbloat Vulnerability Zone";
            this.elements.diagDesc.textContent = `Queue capacity (${p.queueCapacity} pkts) significantly exceeds BDP (${bdp.toFixed(0)} pkts). Latency will inflate.`;
            this.elements.diagBadge.textContent = "RECOMMENDED: CUBIC (with RED/CoDel)";
            this.elements.scoreCubic.textContent = "Suitability: Moderate (7/10)";
            this.elements.scoreNewreno.textContent = "Suitability: Moderate (6/10)";
            this.elements.scoreReno.textContent = "Suitability: Moderate (6/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Poor (4/10)";
        } else {
            this.elements.diagTitle.textContent = "Current Environment: Standard Low-Latency Bottleneck Link";
            this.elements.diagDesc.textContent = `Standard RTT (${rttMs.toFixed(0)}ms) with low loss (${lossPct.toFixed(1)}%). Reno and Cubic both perform reliably.`;
            this.elements.diagBadge.textContent = "RECOMMENDED: TCP CUBIC / RENO";
            this.elements.scoreCubic.textContent = "Suitability: Optimal (10/10)";
            this.elements.scoreNewreno.textContent = "Suitability: High (9/10)";
            this.elements.scoreReno.textContent = "Suitability: High (8/10)";
            this.elements.scoreTahoe.textContent = "Suitability: Moderate (5/10)";
        }

        const v = this.sim.params.variant;
        [this.elements.cardTahoe, this.elements.cardReno, this.elements.cardNewreno, this.elements.cardCubic].forEach(c => c.classList.remove('featured'));
        if (v === 'TcpTahoe') this.elements.cardTahoe.classList.add('featured');
        else if (v === 'TcpReno') this.elements.cardReno.classList.add('featured');
        else if (v === 'TcpNewReno') this.elements.cardNewreno.classList.add('featured');
        else this.elements.cardCubic.classList.add('featured');
    }

    renderVivaQuestions() {
        if (!this.elements.vivaQuizContainer) return;
        this.elements.vivaQuizContainer.innerHTML = VIVA_QUESTIONS.map((q, idx) => `
            <div class="viva-card">
                <div class="viva-q-title">Q${idx + 1}: ${q.question}</div>
                <div class="viva-options-list">
                    ${q.options.map((opt, oIdx) => `
                        <button class="viva-opt-btn" data-qid="${q.id}" data-oidx="${oIdx}">
                            ${String.fromCharCode(65 + oIdx)}. ${opt}
                        </button>
                    `).join('')}
                </div>
                <div class="viva-explanation" id="viva-exp-${q.id}" style="display: none;"></div>
            </div>
        `).join('');

        this.elements.vivaQuizContainer.querySelectorAll('.viva-opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const qid = parseInt(btn.dataset.qid);
                const chosen = parseInt(btn.dataset.oidx);
                const question = VIVA_QUESTIONS.find(item => item.id === qid);
                const expEl = document.getElementById(`viva-exp-${qid}`);

                const parent = btn.parentElement;
                parent.querySelectorAll('.viva-opt-btn').forEach(b => {
                    b.disabled = true;
                    b.style.cursor = 'default';
                });

                if (chosen === question.correct) {
                    btn.classList.add('correct');
                    expEl.className = 'viva-explanation correct-exp';
                    expEl.style.display = 'block';
                    expEl.innerHTML = `<strong>✔ Correct!</strong> ${question.explanation}`;
                } else {
                    btn.classList.add('wrong');
                    // highlight correct button
                    parent.querySelectorAll('.viva-opt-btn')[question.correct].classList.add('correct');
                    expEl.className = 'viva-explanation wrong-exp';
                    expEl.style.display = 'block';
                    expEl.innerHTML = `<strong>✖ Incorrect.</strong> Correct answer is <strong>${String.fromCharCode(65 + question.correct)}</strong>: ${question.explanation}`;
                }
            });
        });
    }

    onInspectTarget(target) {
        this.inspector.inspect(target, this.sim);
    }

    onInspectChartPoint(point) {
        this.pause();
        this.inspector.inspect(point, this.sim);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
