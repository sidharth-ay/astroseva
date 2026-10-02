"""Request IDs and structured logging.

Every response carries an `X-Request-ID` header, generated per request unless
the caller supplied one. The ID is also attached to every log record emitted
while handling that request, so a user report ("it failed at 14:32") maps to
exactly one trace through the logs instead of a grep over timestamps.

Set `LOG_FORMAT=json` for machine-readable output in production. The default
stays human-readable for local development.
"""

import contextvars
import json
import logging
import os
import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "astroseva_request_id", default="-"
)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assign (or propagate) a request ID and time the request."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status: int | str = "error"
        try:
            response = await call_next(request)
            status = response.status_code
        finally:
            # Logged before the reset below: the filter reads the ID out of
            # this same contextvar, so resetting first would log "-".
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            logger.info(
                "%s %s -> %s in %.1fms",
                request.method,
                request.url.path,
                status,
                elapsed_ms,
            )
            # Restored even if the handler raised, so an ID never leaks into
            # an unrelated request sharing the task.
            request_id_var.reset(token)
        response.headers["X-Request-ID"] = request_id
        return response


class RequestIdFilter(logging.Filter):
    """Attach the current request ID to every record, or "-" outside one."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get()
        return True


def configure_logging() -> None:
    log_format = os.getenv("LOG_FORMAT", "text").lower()
    handler = logging.StreamHandler()
    if log_format == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s [%(request_id)s] %(name)s: %(message)s")
        )
    handler.addFilter(RequestIdFilter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


class JsonFormatter(logging.Formatter):
    """One JSON object per line: timestamp, level, logger, message, request_id."""

    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(
            {
                "timestamp": self.formatTime(record, self.datefmt),
                "level": record.levelname,
                "logger": record.name,
                "message": record.getMessage(),
                "request_id": getattr(record, "request_id", "-"),
            },
            default=str,
        )


logger = logging.getLogger(__name__)
