"""Shared rate limiter instance.

Rate limiting is applied by decorating each endpoint, and every route in
`app/api` now carries one. That is explicit rather than incidental: the limit is
visible at the endpoint, and a test (`tests/test_rate_limits.py`) walks the AST
and fails if any endpoint is added without one.

Two alternatives were tried and rejected, both recorded here because the failure
mode of each is invisible:

* `Limiter(default_limits=[...])` looks like an app-wide ceiling, but slowapi
  only evaluates it from inside the `@limiter.limit` decorator, so it does
  nothing for a route that has no decorator.
* `SlowAPIASGIMiddleware` does apply a default to undecorated routes, but it
  resolves the handler with `_find_route_handler(app.routes, scope)`, and in this
  FastAPI version included routers are wrapped in `_IncludedRouter` and their
  paths do not appear on `app.routes`. The lookup therefore returns `None`,
  `_should_exempt` treats that as exempt, and the middleware silently protects
  nothing. Verified directly rather than assumed.

One deployment note, because it decides whether the limits mean anything.
`key_func=get_remote_address` keys on the peer address, and uvicorn honours
`X-Forwarded-For` only from a trusted proxy: `--proxy-headers` is on by default
and `--forwarded-allow-ips` reads `FORWARDED_ALLOW_IPS`, defaulting to loopback.
That default is right when nginx sits on the same host and wrong behind a CDN on
another network -- every request then appears to come from the proxy, so one
caller can exhaust everyone's quota. Set `FORWARDED_ALLOW_IPS` to that network.
Do not set it to `*`: then any client can forge the header and mint itself a
fresh bucket on every request.
"""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

# /health is polled by uptime checks, load balancers and CI. It carries its own
# ceiling so routine polling cannot be throttled into looking like an outage.
HEALTH_LIMIT = os.getenv("RATELIMIT_HEALTH", "1000/minute")

limiter = Limiter(
    key_func=get_remote_address,
    # `headers_enabled` stays off. It was tried and reverted: slowapi injects the
    # X-RateLimit-* headers into a `response` parameter on the handler, so every
    # endpoint that returns a plain dict or a pydantic model without declaring
    # `response: Response` raises "parameter `response` must be an instance of
    # starlette.responses.Response" and answers 500. Turning it on for all
    # eighty-nine routes is not possible.
    #
    # Retry-After is still sent, because it comes from our own 429 handler
    # rather than from slowapi, and that is the header the client reads.
    headers_enabled=False,
)