#!/usr/bin/env python3
import http.server
import os

PORT = 8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

# 多執行緒：可同時處理多條連線（game.js / 題庫 / 大型 mp3 的 range 請求），
# 避免單執行緒被大檔卡住導致其他請求「拒絕連線」
class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with Server(("127.0.0.1", PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f"Server running at http://127.0.0.1:{PORT}")
    httpd.serve_forever()
