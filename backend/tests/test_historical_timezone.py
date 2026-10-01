"""Historical UTC offsets, and the API contract that carries them.

The dataset stores one offset per city, which is what applies *now*. For a birth
chart that is wrong, and by a lot: India ran +5:53:20 until October 1947 and
+6:30 through the 1941-42 British wartime daylight saving, so a 1942 birth
computed at 5.5 is an hour out. London and New York move an hour twice a year.
An hour moves the ascendant and can change which house a planet falls in.

So records carry `tz_iana` and the offset is resolved for the actual birth
moment. These tests pin the resolution and, just as importantly, the fallback:
a caller that sends no zone must get exactly the behaviour it had before, and an
unknown zone must never resolve to something confidently wrong.
"""

from datetime import date, time

import pytest

from app.models.birth_data import BirthData
from app.services.timezone_service import dataset_loads, resolve_offset


# --- resolution ------------------------------------------------------------

@pytest.mark.parametrize(
    "birth_date,zone,expected,why",
    [
        ("1942-01-15", "Asia/Kolkata", 6.5, "British wartime daylight saving"),
        ("1943-06-01", "Asia/Kolkata", 6.5, "still wartime daylight saving"),
        ("1947-10-14", "Asia/Kolkata", 5.5, "pre-change, standard time"),
        ("1990-05-15", "Asia/Kolkata", 5.5, "modern IST"),
        ("2026-10-01", "Asia/Kolkata", 5.5, "present IST"),
        ("1900-01-01", "Asia/Kolkata", 5.3528, "LMT, before standard time"),
    ],
)
def test_indian_offsets_vary_with_the_birth_date(birth_date, zone, expected, why):
    if not dataset_loads():
        pytest.skip("no timezone database installed")
    resolved = resolve_offset(zone, date.fromisoformat(birth_date), time(10, 30))
    assert resolved == pytest.approx(expected, abs=0.001), why


@pytest.mark.parametrize(
    "zone,season,expected",
    [
        ("Europe/London", "2026-01-15", 0.0),
        ("Europe/London", "2026-07-15", 1.0),
        ("America/New_York", "2026-01-15", -5.0),
        ("America/New_York", "2026-07-15", -4.0),
        ("Asia/Singapore", "2026-01-15", 8.0),
        ("Asia/Singapore", "2026-07-15", 8.0),
    ],
)
def test_international_offsets_track_daylight_saving(zone, season, expected):
    if not dataset_loads():
        pytest.skip("no timezone database installed")
    resolved = resolve_offset(zone, date.fromisoformat(season), time(10, 30))
    assert resolved == pytest.approx(expected, abs=0.001)


def test_the_fixed_offset_is_wrong_for_a_1942_birth():
    """The concrete case this exists for.

    If this ever passes with 5.5, the resolution has silently stopped working and
    the fallback is masking it.
    """
    if not dataset_loads():
        pytest.skip("no timezone database installed")
    resolved = resolve_offset("Asia/Kolkata", date(1942, 1, 15), time(10, 30), fallback=5.5)
    assert resolved != 5.5, "the historical offset was not applied"
    assert resolved == pytest.approx(6.5, abs=0.001)


# --- degradation -------------------------------------------------------------

def test_no_zone_returns_the_caller_supplied_offset():
    """A client that never sends a zone must be completely unaffected."""
    assert resolve_offset(None, date(1942, 1, 15), time(10, 30), fallback=5.5) == 5.5
    assert resolve_offset("", date(2026, 1, 15), time(10, 30), fallback=-4.0) == -4.0


def test_an_unknown_zone_falls_back_rather_than_guessing():
    """Never resolve to UTC.

    A confidently wrong five-and-a-half-hour error is far worse than the
    slightly-wrong offset the client already sent.
    """
    resolved = resolve_offset("Not/ARealZone", date(2026, 1, 15), time(10, 30), fallback=5.5)
    assert resolved == 5.5


def test_a_date_only_caller_still_resolves():
    """`birth_time` is optional; noon is used so transitions resolve correctly."""
    assert resolve_offset("Asia/Kolkata", date(1990, 5, 15)) == pytest.approx(5.5, abs=0.001)


# --- the BirthData contract --------------------------------------------------

BASE = dict(name="T", birth_place="Delhi", latitude=28.61, longitude=77.21)


def test_birth_data_resolves_the_offset_from_the_zone():
    if not dataset_loads():
        pytest.skip("no timezone database installed")
    data = BirthData(
        **BASE,
        birth_date="1942-01-15",
        birth_time="10:30",
        timezone_offset=5.5,
        timezone_iana="Asia/Kolkata",
    )
    assert data.timezone_offset == pytest.approx(6.5, abs=0.001)


def test_birth_data_without_a_zone_is_unchanged():
    """Backwards compatibility: existing callers send only `timezone_offset`."""
    data = BirthData(**BASE, birth_date="1942-01-15", birth_time="10:30", timezone_offset=5.5)
    assert data.timezone_offset == 5.5


def test_birth_data_with_an_unknown_zone_is_unchanged():
    data = BirthData(
        **BASE,
        birth_date="1942-01-15",
        birth_time="10:30",
        timezone_offset=5.5,
        timezone_iana="Not/ARealZone",
    )
    assert data.timezone_offset == 5.5


def test_the_resolved_offset_is_still_range_checked():
    """The validator must not be able to push the value outside the model's bounds."""
    data = BirthData(
        **BASE,
        birth_date="1990-05-15",
        birth_time="10:30",
        timezone_offset=5.5,
        timezone_iana="Pacific/Kiritimati",
    )
    assert -12 <= data.timezone_offset <= 14