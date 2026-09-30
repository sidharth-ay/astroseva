"""Transit speed must be computed, not defaulted to a constant.

`/transit/today` reported `round(abs(p.get("speed", 1.0)), 2)`. The engine's
planet dict has no `speed` key at all, so every graha on every day was reported
at exactly 1.0 -- a plausible-looking figure that was a fallback, and one that
also had its sign stripped by `abs`.
"""

import pytest
from datetime import date

from app.api.transit import _daily_motion, _motion_label
from app.core.planets import get_planetary_positions

GRAHAS = ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")

# Plausible daily sidereal motion, in degrees. The Moon moves about 13.2
# degrees a day; the Sun about 1; the slower grahas a fraction of a degree.
BOUNDS = {
    "Sun": (0.95, 1.05),
    "Moon": (11.0, 13.5),
    "Mars": (-0.8, 0.8),
    "Mercury": (-1.4, 1.4),
    "Jupiter": (-0.2, 0.25),
    "Venus": (-1.3, 1.3),
    "Saturn": (-0.15, 0.15),
}


def test_the_engine_emits_no_speed_field():
    """The premise of the bug: there was nothing for `.get` to find."""
    pos = get_planetary_positions(
        year=2026, month=7, day=1, hour=12, minute=0, timezone_offset=5.5,
        latitude=28.6139, longitude=77.209,
    )
    assert pos["planets"]
    for p in pos["planets"]:
        assert "speed" not in p, p["planet"]


@pytest.mark.parametrize("graha", GRAHAS)
@pytest.mark.parametrize("when", [date(2026, 7, 1), date(2026, 11, 15)])
def test_daily_motion_is_in_a_plausible_range(graha, when):
    """The old value was a flat 1.0 for all seven grahas on all days."""
    motion = _daily_motion(graha, when)
    low, high = BOUNDS[graha]
    assert low <= motion <= high, f"{graha} on {when}: {motion}"


def test_motion_varies_by_graha():
    """A constant cannot satisfy this; the Moon and Sun differ hugely."""
    motions = {g: _daily_motion(g, date(2026, 7, 1)) for g in GRAHAS}
    assert len(set(motions.values())) > 1
    assert abs(motions["Moon"]) > 10 * abs(motions["Jupiter"])


def test_motion_varies_by_date():
    a = _daily_motion("Mercury", date(2026, 7, 1))
    b = _daily_motion("Mercury", date(2026, 11, 15))
    assert a != b
    # Mercury is retrograde in July 2026 and direct by November.
    assert a < 0
    assert b > 0


def test_motion_agrees_with_the_engines_retrograde_flag():
    """An independent cross-check: sign of motion against the retrograde flag."""
    for when in (date(2026, 7, 1), date(2026, 11, 15)):
        pos = get_planetary_positions(
            year=when.year, month=when.month, day=when.day, hour=12, minute=0,
            timezone_offset=5.5, latitude=28.6139, longitude=77.209,
        )
        flags = {p["planet"]: p["retrograde"] for p in pos["planets"]}
        for graha in GRAHAS:
            assert (_daily_motion(graha, when) < 0) == flags[graha], (
                graha, when
            )


def test_motion_label():
    assert _motion_label(1.0) == "direct"
    assert _motion_label(-1.0) == "retrograde"
    assert _motion_label(0.01) == "stationary"
    assert _motion_label(-0.01) == "stationary"


def test_motion_survives_the_360_wrap():
    """Unwrapped, so a graha crossing 0/360 does not report a huge jump."""
    for graha in GRAHAS:
        for when in (date(2026, 4, 14), date(2026, 12, 21)):
            motion = _daily_motion(graha, when)
            assert abs(motion) < 15, (graha, when, motion)


# --- through the endpoint -----------------------------------------------------

def test_endpoint_reports_computed_motion_not_a_constant(client):
    body = client.get("/api/v1/transit/today").json()
    motions = {t["planet"]: t["daily_motion"] for t in body["transits"]}
    assert motions
    assert len(set(motions.values())) > 1, motions
    assert 1.0 not in set(motions.values()) or len(motions) == 1, (
        "a graha reporting exactly 1.0 for every day is the old fallback"
    )


def test_endpoint_drops_the_bare_speed_field(client):
    body = client.get("/api/v1/transit/today").json()
    for t in body["transits"]:
        assert "speed" not in t, t
        assert "daily_motion" in t
        assert t["motion"] in ("direct", "retrograde", "stationary")


def test_endpoint_sign_matches_the_motion(client):
    """`abs()` stripped the sign, so a retrograde graha was shown as direct."""
    body = client.get("/api/v1/transit/today").json()
    for t in body["transits"]:
        if t["daily_motion"] < -0.05:
            assert t["motion"] == "retrograde", t
        elif t["daily_motion"] > 0.05:
            assert t["motion"] == "direct", t


def test_frontend_type_declares_the_computed_field():
    from pathlib import Path

    api = (
        Path(__file__).resolve().parents[2] / "frontend" / "src" / "lib" / "api.ts"
    ).read_text(encoding="utf-8")
    assert "daily_motion" in api
