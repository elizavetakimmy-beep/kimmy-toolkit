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
import os
import http.server
import socketserver

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8799
directory = sys.argv[2] if len(sys.argv) > 2 else "."
os.chdir(directory)


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_header(self, key, value):
        # перебиваем text/html без charset, который шлёт базовый обработчик
        if key == "Content-Type" and self.path.endswith(".html"):
            value = "text/html; charset=utf-8"
        super().send_header(key, value)

    def log_message(self, *args):
        pass


class Server(socketserver.TCPServer):
    allow_reuse_address = True   # иначе повторный запуск на том же порту падает


try:
    with Server(("127.0.0.1", port), Handler) as httpd:   # только локально, не в сеть
        print(f"Открой http://localhost:{port}/  (папка: {os.getcwd()})")
        print("Остановить — Ctrl+C")
        httpd.serve_forever()
except OSError as e:
    if getattr(e, "errno", None) in (48, 98):
        sys.exit(f"Порт {port} уже занят. Запусти с другим номером, например:\n"
                 f"  python3 serve.py {port + 1} \"{directory}\"")
    raise
except KeyboardInterrupt:
    print("\nСервер остановлен.")
