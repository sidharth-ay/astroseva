"""Palmistry analysis provider seam.

Uploading a palm photo and analyzing it are two separate decisions, and only
the first is made here. The upload path validates and stores the image; what
turns pixels into a reading -- a vision model, a human reviewer, something
else -- is deliberately unwired.

The seam exists so that decision stays replaceable: `analyze_palm` takes a
stored image and returns a reading from whichever provider is registered, and
right now none is. Registering no provider is not an omission waiting to be
noticed; wiring a model that has not been evaluated would be how a confident,
wrong reading reaches a user.
"""

import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class PalmistryResult(dict):
    """What a provider returns. A dict subclass so it serializes as JSON."""


class PalmistryProvider(Protocol):
    """Something that can read a palm image."""

    name: str

    def analyze(self, image_bytes: bytes, content_type: str) -> PalmistryResult:
        """Return the reading for stored image bytes."""
        ...  # pragma: no cover - interface only


_PROVIDERS: dict[str, PalmistryProvider] = {}


def register_provider(provider: PalmistryProvider) -> None:
    """Make a provider available under its name."""
    _PROVIDERS[provider.name] = provider


def analyze_palm(image_bytes: bytes, content_type: str, provider: str | None = None) -> PalmistryResult:
    """Analyze stored image bytes with the named provider.

    Raises `LookupError` when no provider is registered -- which is the current
    state, and the endpoint turns it into an honest 501 rather than inventing
    a reading.
    """
    if provider is not None:
        try:
            chosen = _PROVIDERS[provider]
        except KeyError:
            raise LookupError(f"unknown palmistry provider: {provider!r}") from None
        return chosen.analyze(image_bytes, content_type)
    if len(_PROVIDERS) == 1:
        return next(iter(_PROVIDERS.values())).analyze(image_bytes, content_type)
    raise LookupError(
        "no palmistry provider is registered; image analysis is not available"
        + (f" ({len(_PROVIDERS)} registered, specify one)" if _PROVIDERS else "")
    )
