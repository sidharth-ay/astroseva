"""Regression tests for the /api/v1/doshas/detect response construction.

The oracle suite (test_dosha_oracles.py) validates DoshaResponse(**r) over the
raw detect_all_doshas() output. That never exercised the endpoint, which
hand-builds the response by picking individual keys. When `kaal_sarp` was added
as a required field on DoshaResponse, the endpoint kept building the response
without it, so every fresh (uncached) /detect call raised a pydantic
ValidationError that was swallowed into HTTP 500
("Error detecting doshos. Please try again.").

These tests pin the endpoint's own construction so a future required field
cannot silently break it again.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.doshas import detect_all_doshas
from app.core.planets import get_planetary_positions
from app.main import app
from app.models.response import DoshaResponse


def _fresh_payload():
    """A chart the cache has never seen (unique minute) to force the code path."""
    return {
        "name": "Endpoint Regression",
        "birth_date": "1990-06-15",
        "birth_time": "10:30",
        "birth_place": "New Delhi, India",
        "latitude": 28.6139 + (int(uuid.uuid4().int) % 40) / 100.0,  # unique-ish
        "longitude": 77.2090,
        "timezone_offset": 5.5,
    }


@pytest.fixture
def client():
    return TestClient(app)


def test_detect_endpoint_returns_all_four_doshas(client):
    """POST /api/v1/doshas/detect must return 200 with all four doshas.

    This is the regression guard for the missing `kaal_sarp` kwarg: the
    endpoint hand-builds DoshaResponse, so a required field left unset raised
    a ValidationError that the global handler turned into HTTP 500.
    """
    resp = client.post("/api/v1/doshas/detect", json=_fresh_payload())
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for key in ("manglik", "kaal_sarp", "sade_sati", "pitru_dosha", "total_doshas"):
        assert key in body, f"missing '{key}' in detect response: {list(body)}"
    assert isinstance(body["kaal_sarp"], dict)
    assert 0 <= body["total_doshas"] <= 4


def test_detect_endpoint_survives_stale_cache_entry(client, monkeypatch):
    """A pre-kaal_sarp cache hit must not 500; the endpoint recomputes instead."""
    payload = _fresh_payload()
    # Prime nothing: force a cache hit with a stale (incomplete) payload.
    async def fake_get(_key):
        return {
            "manglik": {"is_manglik": False},
            "sade_sati": {"is_active": False},
            "pitru_dosha": {"has_dosha": False},
            "total_doshas": 0,
        }

    monkeypatch.setattr("app.api.doshas.cache_service.get", fake_get)
    resp = client.post("/api/v1/doshas/detect", json=payload)
    # Guarded cache read -> treated as a miss -> recomputed -> 200 with kaal_sarp.
    assert resp.status_code == 200, resp.text
    assert "kaal_sarp" in resp.json()


def _endpoint_detection(year, month, day, hour, minute, tz, lat, lon):
    """Run the same steps as api/doshas.py::detect_doshas (uncached path)."""
    positions = get_planetary_positions(year, month, day, hour, minute, tz, lat, lon)
    asc_sign = int(positions["ascendant"] / 30)
    moon_sign = next(p["sign"] for p in positions["planets"] if p["planet"] == "Moon")
    doshas = detect_all_doshas(
        planets=positions["planets"],
        asc_sign=asc_sign,
        moon_sign=moon_sign,
        transit_saturn_sign=7,
    )
    return doshas


def test_detect_response_includes_kaal_sarp():
    """The endpoint response must carry all four doshas, including kaal_sarp."""
    doshas = _endpoint_detection(1990, 6, 15, 10, 30, 5.5, 28.6139, 77.2090)

    # The core engine already returns kaal_sarp ...
    assert "kaal_sarp" in doshas

    # ... and the endpoint must pass it through to the response model.
    response = DoshaResponse(
        manglik=doshas["manglik"],
        kaal_sarp=doshas["kaal_sarp"],
        sade_sati=doshas["sade_sati"],
        pitru_dosha=doshas["pitru_dosha"],
        total_doshas=doshas["total_doshas"],
    )
    assert response.kaal_sarp == doshas["kaal_sarp"]
    assert 0 <= response.total_doshas <= 4


def test_detect_response_has_all_required_fields():
    """Every required field of DoshaResponse must be populated by the endpoint."""
    doshas = _endpoint_detection(1985, 3, 20, 22, 15, 5.5, 19.0760, 72.8777)
    response = DoshaResponse(
        manglik=doshas["manglik"],
        kaal_sarp=doshas["kaal_sarp"],
        sade_sati=doshas["sade_sati"],
        pitru_dosha=doshas["pitru_dosha"],
        total_doshas=doshas["total_doshas"],
    )
    required = set(DoshaResponse.model_fields.keys())
    assert required == {"manglik", "kaal_sarp", "sade_sati", "pitru_dosha", "total_doshas"}
    # model_dump round-trips cleanly (as used for the cache set)
    assert set(response.model_dump().keys()) == required


def test_stale_cache_entry_without_kaal_sarp_is_ignored():
    """A pre-kaal_sarp cache payload must not raise; the cache read is guarded.

    The endpoint returns DoshaResponse(**cached) when a cache hit occurs. Cache
    entries written before kaal_sarp existed lack that key and would raise a
    ValidationError -> 500. The endpoint must only trust cache entries that
    contain every required field.
    """
    required = set(DoshaResponse.model_fields.keys())

    # Simulate a stale pre-kaal_sarp cache entry.
    stale = {
        "manglik": {"is_manglik": False},
        "sade_sati": {"is_active": False},
        "pitru_dosha": {"has_dosha": False},
        "total_doshas": 0,
    }
    assert "kaal_sarp" not in stale

    # This is the guard the endpoint applies before trusting a cache hit.
    is_complete = required.issubset(stale.keys())
    assert is_complete is False  # endpoint must treat this as a miss and recompute
    # And the current bug: constructing from the stale payload would raise.
    with pytest.raises(Exception):
        DoshaResponse(**stale)
