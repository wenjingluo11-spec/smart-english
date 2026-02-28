"""安全中间件 - 速率限制、安全头、输入清理。使用纯 ASGI 实现，避免与 CORSMiddleware 冲突。"""

import time
from collections import defaultdict
from starlette.types import ASGIApp, Receive, Scope, Send


class SecurityHeadersMiddleware:
    """添加安全响应头（纯 ASGI 实现）。"""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"referrer-policy", b"strict-origin-when-cross-origin"))
                headers.append((b"permissions-policy", b"camera=(), microphone=(), geolocation=()"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)


class RateLimitMiddleware:
    """简单的内存速率限制（纯 ASGI 实现）。"""

    def __init__(self, app: ASGIApp, max_requests: int = 60, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        method = scope.get("method", "")

        # Skip rate limiting for static files and CORS preflight requests
        if path.startswith("/uploads") or method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        # Extract client IP
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"
        now = time.time()

        # Clean old entries
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < self.window
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            response_body = b'{"detail":"\xe8\xaf\xb7\xe6\xb1\x82\xe8\xbf\x87\xe4\xba\x8e\xe9\xa2\x91\xe7\xb9\x81\xef\xbc\x8c\xe8\xaf\xb7\xe7\xa8\x8d\xe5\x90\x8e\xe5\x86\x8d\xe8\xaf\x95"}'
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"retry-after", str(self.window).encode()),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": response_body,
            })
            return

        self.requests[client_ip].append(now)

        # Periodic cleanup
        if len(self.requests) > 1000:
            cutoff = now - self.window
            self.requests = defaultdict(
                list,
                {k: [t for t in v if t > cutoff] for k, v in self.requests.items() if v},
            )

        await self.app(scope, receive, send)
