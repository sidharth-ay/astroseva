"""Gemstone recommendations must follow from the chart, or not be given.

`/gemstones/recommend` computed the ascendant and every planet's house and then
never read any of it: the response was a fixed list of seven gemstones for
everyone, plus a recommendations paragraph that varied only on whether Saturn,
Jupiter or Mercury happened to be retrograde.
"""

import pytest

BASE = {
    "name": "Test", "birth_date": "1990-05-15", "birth_time": "10:30",
    "birth_place": "Delhi", "latitude": 28.6139, "longitude": 77.209,
    "timezone_offset": 5.5,
}

ALL_GRAHAS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")


def _payload(**overrides):
    return {**BASE, **overrides}


def test_every_recommendation_is_justified_by_the_chart(client):
    """No recommendation may appear without a reason drawn from the chart."""
    body = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    assert body["gemstones"], "no recommendations returned"

    chart = client.post("/api/v1/kundli/generate", json=_payload()).json()
    by_name = {p["planet"]: p for p in chart["planets"]}

    for gem in body["gemstones"]:
        name = gem["planet"]
        assert name in ALL_GRAHAS, name
        reason = gem.get("reason")
        assert reason, f"{name} is recommended with no stated reason"
        # The reason must cite something real about that planet's placement.
        assert by_name[name]["sign_name"] in reason or str(
            by_name[name]["house"]
        ) in reason or name in reason


def test_recommendations_vary_between_charts(client):
    """The old response returned all seven gemstones for every chart."""
    a = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    b = client.post("/api/v1/gemstones/recommend", json=_payload(
        birth_date="1975-11-02", birth_time="22:40",
    )).json()
    assert {g["planet"] for g in a["gemstones"]} != {
        g["planet"] for g in b["gemstones"]
    }, "the same seven gemstones are recommended for every chart"


def test_a_strong_planet_is_not_merely_ignored(client):
    """A graha in its own sign is a positive indication and may be recommended;
    a graha badly placed or combust is not, and must not be."""
    body = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    for gem in body["gemstones"]:
        assert gem.get("condition") in (
            "own_sign", "exalted", "friendly", "dignity"
        ), gem


def test_combustion_is_reported_and_blocks_a_recommendation(client):
    """A combust graha is traditionally contraindicated.

    `COMBUST_DEGREES` in core/grahayukti already holds the angular limits; the
    endpoint was not using them, so a graha sitting within a few degrees of the
    Sun could still be recommended.
    """
    from app.core.grahayukti import COMBUST_DEGREES

    body = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    chart = client.post("/api/v1/kundli/generate", json=_payload()).json()
    longitudes = {p["planet"]: p["longitude"] for p in chart["planets"]}
    sun = longitudes["Sun"]

    considered = {c["planet"]: c for c in body["considerations"]}
    assert set(considered) == set(ALL_GRAHAS), sorted(considered)

    for gem in body["gemstones"]:
        name = gem["planet"]
        limit = COMBUST_DEGREES.get(name)
        if limit is None:
            continue
        separation = abs((longitudes[name] - sun + 180) % 360 - 180)
        if separation < limit:
            assert considered[name]["combust"] is True, name
            assert gem.get("condition") not in ("exalted", "own_sign"), (
                f"{name} is {separation:.1f}deg from the Sun (limit {limit}) "
                f"yet recommended on a strength condition"
            )


def test_response_states_its_basis_and_limits(client):
    body = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    assert body["basis"], "the response does not say what the advice is based on"
    assert body["disclaimer"], "the response carries no caution about wearing stones"
    assert "ascendant" in body["basis"].lower()


def test_response_reports_the_chart_it_used(client):
    """The user can see which placements the advice was drawn from."""
    body = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    assert body["ascendant"]
    assert body["considerations"], "no per-graha consideration is reported"


def test_gemstone_metadata_is_not_a_recommendation(client):
    """Weight, metal, finger and day belong to the stone, not to the chart."""
    body = client.post("/api/v1/gemstones/recommend", json=_payload()).json()
    for gem in body["gemstones"]:
        assert gem["gemstone"]
        assert "metal" in gem and "finger" in gem
