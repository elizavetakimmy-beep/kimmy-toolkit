#!/usr/bin/env python3
"""
Tiny localhost server that serves .html with an explicit UTF-8 charset.

Why this exists: previewing the dashboard through `file://` tends to hang in
embedded browser panes, and bare `python -m http.server` sends
`text/html` with no charset, so a browser guesses Latin-1 and Cyrillic turns
into mojibake ("Ð”Ð°ÑˆÐ±Ð¾Ñ€Ð´"). This forces the right header.

Usage:
    python3 serve.py [port] [directory]
Then open  http://localhost:<port>/<your-file>.html  and screenshot it.
"""
import sys
import http.server
import socketserver
import os

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
directory = sys.argv[2] if len(sys.argv) > 2 else "."
os.chdir(directory)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith(".html"):
            self.send_header("Content-Type", "text/html; charset=utf-8")
        super().end_headers()

    def send_header(self, key, value):
        # override any earlier text/html the base handler queued
        if key == "Content-Type" and self.path.endswith(".html"):
            value = "text/html; charset=utf-8"
        super().send_header(key, value)


with socketserver.TCPServer(("", port), Handler) as httpd:
    print(f"serving {os.getcwd()} at http://localhost:{port}")
    httpd.serve_forever()
