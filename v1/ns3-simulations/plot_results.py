#!/usr/bin/env python3
"""
Automated Plotting Script for Course-Based Project (CBP)
Generates publication-quality comparative performance figures for report & slides.
"""

import os
import json
import matplotlib
import matplotlib.pyplot as plt

# Styling setup
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
matplotlib.rcParams['font.family'] = 'sans-serif'
matplotlib.rcParams['font.size'] = 10

TRACES_DIR = os.path.join(os.path.dirname(__file__), "sample_traces")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

VARIANTS = [
    ("tcptahoe", "TCP Tahoe", "#ef4444", "-"),
    ("tcplinuxreno", "TCP Reno", "#f59e0b", "--"),
    ("tcpnewreno", "TCP NewReno", "#10b981", "-."),
    ("tcpcubic", "TCP Cubic", "#0284c7", "-")
]

def load_trace(variant_key, loss_rate=0.01):
    path = os.path.join(TRACES_DIR, f"{variant_key}_loss_{loss_rate}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)

def plot_cwnd_comparison(loss_rate=0.01):
    """Plot CWND vs Time for all 4 algorithms on the same axis."""
    plt.figure(figsize=(10, 5), dpi=300)

    for v_key, label, color, style in VARIANTS:
        data = load_trace(v_key, loss_rate)
        if not data:
            continue
        times = [p["time"] for p in data["cwnd"]]
        cwnds = [p["cwnd_mss"] for p in data["cwnd"]]
        plt.plot(times, cwnds, label=label, color=color, linestyle=style, linewidth=2, alpha=0.85)

    plt.title(f"Congestion Window (cwnd) Evolution Over Time (Bottleneck Loss: {loss_rate*100:.1f}%)", fontsize=12, fontweight="bold")
    plt.xlabel("Simulation Time (seconds)", fontsize=11)
    plt.ylabel("Congestion Window (MSS = 1460 B)", fontsize=11)
    plt.ylim(0, 45)
    plt.xlim(1.0, 20.0)
    plt.legend(frameon=True, loc="upper right")
    plt.tight_layout()

    out_path = os.path.join(OUTPUT_DIR, f"cwnd_comparison_loss_{loss_rate}.png")
    plt.savefig(out_path)
    plt.close()
    print(f"[✓] Generated: {out_path}")

def plot_throughput_vs_loss():
    """Bar chart comparing throughput across loss rates."""
    loss_rates = [0.0, 0.001, 0.01, 0.05]
    labels_loss = ["0.0% (No Loss)", "0.1% (Low)", "1.0% (Medium)", "5.0% (Severe)"]

    data_matrix = {v_label: [] for _, v_label, _, _ in VARIANTS}

    for loss in loss_rates:
        for v_key, v_label, _, _ in VARIANTS:
            d = load_trace(v_key, loss)
            tput = d["metadata"]["avg_throughput_mbps"] if d else 0
            data_matrix[v_label].append(tput)

    import numpy as np
    x = np.arange(len(loss_rates))
    width = 0.18

    plt.figure(figsize=(10, 5.5), dpi=300)

    for i, (_, v_label, color, _) in enumerate(VARIANTS):
        plt.bar(x + (i - 1.5) * width, data_matrix[v_label], width, label=v_label, color=color, alpha=0.9)

    plt.title("Throughput Resilience Under Increasing Packet Loss Rates", fontsize=12, fontweight="bold")
    plt.xlabel("Channel Packet Loss Rate", fontsize=11)
    plt.ylabel("Average Goodput (Mbps)", fontsize=11)
    plt.xticks(x, labels_loss)
    plt.ylim(0, 11)
    plt.axhline(10.0, color="#64748b", linestyle=":", label="Bottleneck Physical Capacity (10 Mbps)")
    plt.legend(frameon=True, loc="lower left")
    plt.tight_layout()

    out_path = os.path.join(OUTPUT_DIR, "throughput_vs_loss_comparison.png")
    plt.savefig(out_path)
    plt.close()
    print(f"[✓] Generated: {out_path}")

def plot_queue_delay():
    """Plot queue fill dynamics and buffer occupancy."""
    plt.figure(figsize=(10, 4.5), dpi=300)
    data = load_trace("tcpcubic", 0.01)

    if data and "queue" in data:
        times = [p["time"] for p in data["queue"]]
        q_pkts = [p["queue_pkts"] for p in data["queue"]]
        plt.plot(times, q_pkts, color="#a855f7", linewidth=2, label="Router 1 Queue Occupancy (pkts)")
        plt.axhline(50, color="#ef4444", linestyle="--", label="Queue Limit (DropTail = 50 pkts)")
        plt.fill_between(times, q_pkts, color="#a855f7", alpha=0.2)

    plt.title("Bottleneck Queue Buffer Occupancy Dynamics (TCP Cubic, 1% Loss)", fontsize=12, fontweight="bold")
    plt.xlabel("Simulation Time (seconds)", fontsize=11)
    plt.ylabel("Packets in FIFO Buffer", fontsize=11)
    plt.ylim(0, 60)
    plt.xlim(1.0, 20.0)
    plt.legend(frameon=True, loc="upper right")
    plt.tight_layout()

    out_path = os.path.join(OUTPUT_DIR, "queue_dynamics_cubic.png")
    plt.savefig(out_path)
    plt.close()
    print(f"[✓] Generated: {out_path}")

def main():
    print("[+] Plotting publication-grade comparative performance figures...")
    plot_cwnd_comparison(0.01)
    plot_throughput_vs_loss()
    plot_queue_delay()
    print("[✓] All figures generated in docs/figures/ successfully!")

if __name__ == "__main__":
    main()

