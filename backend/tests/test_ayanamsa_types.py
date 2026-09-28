"""Ayanamsa selection regression tests.

"kp" is an ayanamsa variant used by the kundli feature, entirely separate from
the KP Astrology feature (app/api/kp.py, removed). The two share a name only.

A naive "grep kp and delete" cleanup takes out the kundli ayanamsa too and
breaks the endpoint for anyone who selects it, with no other test failing.
These tests pin every supported ayanamsa value on the kundli endpoint.
"""

import pytest

BIRTH = {
    "name": "Ayanamsa Check",
    "birth_date": "1990-06-15",
    "birth_time": "10:30",
    "birth_place": "New Delhi, India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone_offset": 5.5,
}

SUPPORTED = ["lahiri", "kp", "b_v_raman", "surya_siddhanta"]


@pytest.mark.parametrize("ayanamsa", SUPPORTED)
def test_kundli_accepts_supported_ayanamsa(client, ayanamsa):
    resp = client.post(f"/api/v1/kundli/generate?ayanamsa_type={ayanamsa}", json=BIRTH)
    assert resp.status_code == 200, f"{ayanamsa} -> {resp.status_code}: {resp.text}"
    body = resp.json()
    # The response should report back the ayanamsa actually used.
    assert "ayanamsa" in body


def test_kundli_rejects_unknown_ayanamsa(client):
    resp = client.post("/api/v1/kundli/generate?ayanamsa_type=not_a_real_one", json=BIRTH)
    assert resp.status_code == 400, f"expected 400, got {resp.status_code}"


def test_ayanamsa_offset_table_still_defines_every_variant():
    """The offset table in app/core/planets.py must keep all four entries."""
    from app.core.planets import AYANAMSA_OFFSETS

    for name in SUPPORTED:
        assert name in AYANAMSA_OFFSETS, f"ayanamsa '{name}' vanished from the table"
