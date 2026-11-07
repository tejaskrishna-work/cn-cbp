/**
 * NS-3 Trace Parser and Dataset Loader
 * Bridges offline NS-3 C++ simulation outputs with the web visualizer.
 */

export class Ns3TraceLoader {
    /**
     * Parse raw NS-3 C++ output text trace (e.g. cwnd.data)
     * Format: Time(s) \t OldCwnd(B) \t NewCwnd(B)
     */
    static parseCwndData(rawText, mss = 1460) {
        const lines = rawText.trim().split('\n');
        const points = [];

        for (const line of lines) {
            if (line.startsWith('#') || line.trim() === '') continue;
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 3) {
                const time = parseFloat(parts[0]);
                const newCwndBytes = parseFloat(parts[2]);
                const cwndMss = parseFloat((newCwndBytes / mss).toFixed(2));
                points.push({
                    time,
                    cwnd: cwndMss,
                    cwndBytes: newCwndBytes,
                    state: cwndMss < 16 ? 'SLOW_START' : 'CONGESTION_AVOIDANCE',
                    formula: 'NS-3 Traced Socket Output',
                    reason: `NS-3 Socket Event: cwnd updated to ${cwndMss} MSS (${newCwndBytes} Bytes)`
                });
            }
        }
        return points;
    }

    /**
     * Loads a pre-generated NS-3 benchmark trace JSON file
     */
    static async loadSampleTrace(variant, lossRate = 0.01) {
        const vKey = variant.toLowerCase();
        const url = `../ns3-simulations/sample_traces/${vKey}_loss_${lossRate}.json`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                // Try fallback relative path
                const fallbackUrl = `sample_traces/${vKey}_loss_${lossRate}.json`;
                const resp2 = await fetch(fallbackUrl);
                return await resp2.json();
            }
            return await resp.json();
        } catch (err) {
            console.warn(`Could not fetch ${url}, fallback to analytical generation:`, err);
            return null;
        }
    }
}

