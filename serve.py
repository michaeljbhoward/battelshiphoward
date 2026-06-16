#!/usr/bin/env python3
"""Tiny dev server that disables caching so file changes always show up."""
import http.server
import socketserver

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # Drop Last-Modified so the browser never issues conditional 304 requests
        if keyword.lower() == "last-modified":
            return
        super().send_header(keyword, value)


with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving with no-cache headers at http://localhost:{PORT}")
    httpd.serve_forever()
