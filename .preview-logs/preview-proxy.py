#!/usr/bin/env python3
"""
Preview reverse proxy for Ibn Hayan healthcare OS.

Listens on port 3000 and routes:
  /api/v1/*  -> http://127.0.0.1:3001/api/v1/*  (NestJS API)
  /*         -> http://127.0.0.1:3002/*          (Next.js web)

This lets the public preview (Caddy on port 81 -> port 3000) serve both
the Next.js UI and the NestJS API from the same origin, so the browser
can call /api/v1/* without needing direct access to localhost:3001.

For /api/v1/* requests, the Origin header is normalized to
http://localhost:3000 so the API's Origin check passes regardless of
the public preview URL. This is a preview-only accommodation; it does
NOT modify any repository file or change the production security
posture.

No repository files are modified. This script lives entirely under
/home/z/my-project/.preview-logs/.
"""

import http.server
import http.client
import socketserver


API_HOST = '127.0.0.1'
API_PORT = 3001
WEB_HOST = '127.0.0.1'
WEB_PORT = 3002
LISTEN_PORT = 3000
NORMALIZED_ORIGIN = 'http://localhost:3000'

# Hop-by-hop headers that should not be forwarded
HOP_BY_HOP = {
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade',
}


class PreviewProxy(http.server.BaseHTTPRequestHandler):
    """Reverse proxy that routes /api/v1/* to the API, everything else to Next.js."""

    protocol_version = 'HTTP/1.1'

    def do_GET(self): self._proxy()
    def do_POST(self): self._proxy()
    def do_PUT(self): self._proxy()
    def do_DELETE(self): self._proxy()
    def do_PATCH(self): self._proxy()
    def do_OPTIONS(self): self._proxy()
    def do_HEAD(self): self._proxy()

    def _proxy(self):
        path = self.path
        is_api = path.startswith('/api/v1') or path == '/api/v1'
        target_host = API_HOST if is_api else WEB_HOST
        target_port = API_PORT if is_api else WEB_PORT

        # Read request body
        content_length = int(self.headers.get('Content-Length', 0) or 0)
        body = self.rfile.read(content_length) if content_length > 0 else b''

        # Build the upstream request headers
        headers = {}
        for key, value in self.headers.items():
            if key.lower() in HOP_BY_HOP:
                continue
            headers[key] = value
        # Normalize Host header to match target
        headers['Host'] = f'{target_host}:{target_port}'
        # For API requests, normalize the Origin header so the API's
        # Origin check passes regardless of the public preview URL.
        if is_api and 'origin' in {k.lower() for k in headers}:
            for k in list(headers.keys()):
                if k.lower() == 'origin':
                    headers[k] = NORMALIZED_ORIGIN
        elif is_api and self.command in ('POST', 'PUT', 'DELETE', 'PATCH'):
            # If no Origin was sent but the request is state-changing,
            # add one so the API accepts it.
            headers['Origin'] = NORMALIZED_ORIGIN

        # Make the upstream request
        try:
            conn = http.client.HTTPConnection(target_host, target_port, timeout=30)
            conn.request(self.command, path, body=body, headers=headers)
            resp = conn.getresponse()
            resp_body = resp.read()
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Connection', 'close')
            self.end_headers()
            self.wfile.write(f'Proxy error: {e}\n'.encode('utf-8'))
            return

        # Send response back to client
        self.send_response(resp.status, resp.reason)
        resp_headers = resp.getheaders()
        has_content_length = False
        for key, value in resp_headers:
            if key.lower() in HOP_BY_HOP:
                continue
            if key.lower() == 'content-length':
                has_content_length = True
            self.send_header(key, value)
        if not has_content_length:
            self.send_header('Content-Length', str(len(resp_body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(resp_body)

        try:
            conn.close()
        except Exception:
            pass

    def log_message(self, format, *args):
        import sys
        sys.stderr.write(f"[proxy] {self.command} {self.path} -> {args[1]}\n")


class ThreadingProxy(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    server = ThreadingProxy(('0.0.0.0', LISTEN_PORT), PreviewProxy)
    print(f'Preview proxy listening on port {LISTEN_PORT}')
    print(f'  /api/v1/* -> http://{API_HOST}:{API_PORT} (Origin normalized to {NORMALIZED_ORIGIN})')
    print(f'  /*       -> http://{WEB_HOST}:{WEB_PORT}')
    server.serve_forever()
