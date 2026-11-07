/**
 * Automated Verification Script for TCP Simulation Engine
 */
import { NetworkSimulator } from '../v2/web-simulator/js/engine/simulator.js';

console.log("=== STARTING SIMULATION ENGINE VERIFICATION ===");

const VARIANTS = ['TcpTahoe', 'TcpReno', 'TcpNewReno', 'TcpCubic'];
const LOSS_RATES = [0.0, 0.01, 0.05];

let allPassed = true;

for (const variant of VARIANTS) {
    for (const loss of LOSS_RATES) {
        process.stdout.write(`Testing ${variant} with loss ${loss * 100}%... `);
        
        const sim = new NetworkSimulator();
        sim.setVariant(variant);
        sim.updateParams({
            bandwidthMbps: 10.0,
            propagationDelayMs: 20.0,
            packetLossRate: loss,
            queueCapacity: 50,
            simSpeed: 1.0
        });

        // Step simulation for 10 simulated seconds (200 steps of 0.05s)
        for (let i = 0; i < 200; i++) {
            sim.step(0.05);

            // Assert sanity on every step
            if (isNaN(sim.tcpAgent.cwnd) || sim.tcpAgent.cwnd <= 0) {
                console.error(`FAILED: Invalid cwnd (${sim.tcpAgent.cwnd}) at t=${sim.currentTime}`);
                allPassed = false;
                break;
            }
            if (isNaN(sim.tcpAgent.ssthresh) || sim.tcpAgent.ssthresh <= 0) {
                console.error(`FAILED: Invalid ssthresh (${sim.tcpAgent.ssthresh}) at t=${sim.currentTime}`);
                allPassed = false;
                break;
            }
            if (isNaN(sim.stats.currentThroughputMbps)) {
                console.error(`FAILED: Invalid throughput at t=${sim.currentTime}`);
                allPassed = false;
                break;
            }
        }

        const metrics = {
            t: sim.currentTime.toFixed(1),
            cwnd: sim.tcpAgent.cwnd.toFixed(2),
            ssthresh: sim.tcpAgent.ssthresh.toFixed(1),
            drops: sim.stats.totalDroppedPackets,
            avgThroughput: sim.stats.avgThroughputMbps.toFixed(2) + " Mbps"
        };
        console.log(`OK! (Final: cwnd=${metrics.cwnd}, drops=${metrics.drops}, tput=${metrics.avgThroughput})`);
    }
}

if (allPassed) {
    console.log("\n[SUCCESS] ALL 12 TEST SUITES PASSED FLAWLESSLY WITH 0 ERRORS OR NaNs!");
} else {
    console.error("\n[ERROR] SOME TESTS FAILED!");
    process.exit(1);
}

