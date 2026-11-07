#!/usr/bin/env python3
"""
One-Click Launcher for the TCP Congestion Control Interactive Visualizer
Starts a local HTTP server and automatically opens the dashboard in your default browser.
"""

import os
import sys
import webbrowser
import http.server
import socketserver

PORT = 8080
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web-simulator")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def get_local_ip():
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def main():
    os.chdir(DIRECTORY)
    local_ip = get_local_ip()
    print("=" * 70)
    print("  TCP Congestion Control Simulator & NS-3 Analyzer")
    print(f"  Local Access:       http://localhost:{PORT}")
    print(f"  Share with Friends: http://{local_ip}:{PORT}  (Same Wi-Fi / LAN)")
    print("=" * 70)
    print(" Opening your web browser automatically...")
    print(" Press Ctrl+C in this terminal to stop the server.")
    print("=" * 70)

    webbrowser.open(f"http://localhost:{PORT}/index.html")

    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")

if __name__ == "__main__":
    main()

