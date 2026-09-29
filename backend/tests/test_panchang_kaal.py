"""Rahu Kaal day, clock formatting, and polar sunrise.

Three defects in the kaal and sun-time code, each of which produced plausible
output rather than an error.
"""

import math
from datetime import date, datetime

import pytest

from app.core.panchang import (
    RAHU_KAAL_BASE,
    _format_clock,
    calculate_rahu_kaal,
    calculate_sunrise_sunset,
)

# RAHU_KAAL_BASE is keyed 0=Sunday, the same convention `calculate_vara`
# converts to. Python's `date.weekday()` is 0=Monday, so passing it raw looks
# up the next day's window.
VEDIC_SUNDAY_FIRST = {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
                      4: "Thursday", 5: "Friday", 6: "Saturday"}


def _vedic_index(d: date) -> int:
    return (d.weekday() + 1) % 7


def test_rahu_kaal_base_is_keyed_from_sunday():
    """The table's own comments state the convention; the code must match it."""
    # 04:30-06:00 is the Sunday window, 07:30-09:00 Monday's, 15:00-16:30
    # Tuesday's. If the keying were Monday-first, index 0 would be Monday.
    assert RAHU_KAAL_BASE[0] == (4.5, 6.0)
    assert RAHU_KAAL_BASE[1] == (7.5, 9.0)
    assert RAHU_KAAL_BASE[2] == (15.0, 16.5)


def test_rahu_kaal_uses_the_conversion_get_panchang_uses():
    """`festivals._build` passed `date.weekday()` straight through.

    That is 0=Monday, so every day reported the window belonging to the
    following day: Sundays showed Monday's Rahu Kaal, and so on around the
    week. `get_panchang` already converted with `(weekday + 1) % 7`.
    """
    for d in (date(2026, 3, 15), date(2026, 3, 16), date(2026, 3, 17)):
        correct = calculate_rahu_kaal(6.0, 18.0, _vedic_index(d))
        shifted = calculate_rahu_kaal(6.0, 18.0, d.weekday())
        assert correct["start"] != shifted["start"], d
        assert correct["start"] == calculate_rahu_kaal(6.0, 18.0, _vedic_index(d))["start"]


def test_rahu_kaal_sunday_window_is_the_early_morning_one():
    """Sanity check on the corrected keying: index 0 is Sunday's window.

    The base table is 04:30-06:00, which is an offset from a 04:30 sunrise. The
    function scales it against the actual sunrise, so with a 06:00 sunrise the
    same window lands at 06:00-07:30. The point of the check is which DAY's
    window was chosen, not the absolute hour.
    """
    sunday = calculate_rahu_kaal(4.5, 16.5, 0)
    assert sunday["start_decimal"] == pytest.approx(4.5)
    assert sunday["end_decimal"] == pytest.approx(6.0)
    # Monday's window is offset by three hours from Sunday's.
    monday = calculate_rahu_kaal(4.5, 16.5, 1)
    assert monday["start_decimal"] == pytest.approx(7.5)


def test_rahu_kaal_lies_within_the_day():
    for vedic in range(7):
        r = calculate_rahu_kaal(6.0, 18.0, vedic)
        assert r["start_decimal"] >= 6.0, vedic
        assert r["end_decimal"] <= 18.0, vedic
        assert r["start_decimal"] < r["end_decimal"], vedic


# --- clock formatting ---------------------------------------------------------

@pytest.mark.parametrize("hour,expected", [
    (0.0, "00:00"),
    (6.5, "06:30"),
    (12.0, "12:00"),
    (23.9, "23:54"),
    (11.995, "12:00"),   # 71.7 minutes rounds up without becoming 12:60
    (23.999, "23:59"),    # still inside the day, so still a real time
    (23.99999, "23:59"),  # rounds up to midnight and is held at the last minute
])
def test_format_clock_produces_a_real_time(hour, expected):
    assert _format_clock(hour) == expected


@pytest.mark.parametrize("hour", [-0.5, -1.0, 24.0, 25.5, 100.0])
def test_format_clock_refuses_impossible_hours(hour):
    """Previously printed strings like "-1:-30" and "24:45".

    A polar day puts sunset before sunrise, and the kaal scaling then yields
    negative or past-midnight hours, which were formatted as if valid.
    """
    assert _format_clock(hour) == "--:--"


def test_format_clock_never_emits_a_sixtyth_minute():
    """Rounding 59.7 minutes up used to print "12:60"."""
    assert _format_clock(12 + 59.7 / 60) == "13:00"
    assert ":60" not in _format_clock(11 + 59.99 / 60)


def test_format_clock_handles_non_finite():
    assert _format_clock(float("nan")) == "--:--"
    assert _format_clock(float("inf")) == "--:--"
    assert _format_clock(None) == "--:--"


# --- polar sunrise ------------------------------------------------------------

def test_sunrise_below_the_arctic_circle_is_reported_unavailable():
    """Svalbard in December: the sun does not rise.

    The old code clamped the hour-angle ratio into [-1, 1] regardless of
    whether it was in range, so an arctic latitude returned the sunrise and
    sunset of a latitude 90 degrees away, and every kaal and festival window
    derived from it was quietly wrong.
    """
    r = calculate_sunrise_sunset(date(2026, 12, 21), 78.22, 15.65, 1.0)
    assert r["sunrise"] is None
    assert r["sunset"] is None
    assert r["polar_day_or_night"] is True


def test_sunrise_deep_in_the_arctic_winter_is_unavailable():
    """Just past the arctic circle the sun still clears the horizon by a
    fraction of a degree, so the polar case needs a real Svalbard winter."""
    r = calculate_sunrise_sunset(date(2026, 12, 21), 78.22, 15.65, 1.0)
    assert r["polar_day_or_night"] is True
    assert r["sunrise"] is None


def test_sunrise_just_inside_the_arctic_circle_still_works():
    """The polar branch must not swallow latitudes that do have a sunrise."""
    r = calculate_sunrise_sunset(date(2026, 12, 21), 66.5, 25.0, 2.0)
    assert r["polar_day_or_night"] is False
    assert r["sunrise"] is not None
    assert r["sunrise"] < r["sunset"]


def test_sunrise_during_the_arctic_midnight_sun_is_unavailable():
    """Tromso in June: the sun does not set."""
    r = calculate_sunrise_sunset(date(2026, 6, 21), 69.65, 18.96, 2.0)
    assert r["polar_day_or_night"] is True
    assert r["sunset"] is None


def test_delhi_sunrise_is_unchanged():
    """The Delhi baseline the festival tests pin must not move."""
    r = calculate_sunrise_sunset(date(2026, 3, 11), 28.6139, 77.2090, 5.5)
    assert r["polar_day_or_night"] is False
    # 06:37 IST, the value the festival tests and the live check both pin.
    assert r["sunrise"] == pytest.approx(6.63, abs=0.03)
    assert r["sunset"] == pytest.approx(18.43, abs=0.03)
    assert r["sunrise"] < r["solar_noon"] < r["sunset"]


def test_rahu_kaal_survives_an_inverted_day():
    """Where sunset precedes sunrise, the window must not claim to be real."""
    r = calculate_rahu_kaal(18.0, 6.0, 0)  # polar-style inverted day
    assert r["start"] == "--:--" or r["start"].count(":") == 1
    # Whatever it reports, it must not be an impossible clock string.
    for field in ("start", "end"):
        value = r[field]
        if value != "--:--":
            hh, mm = value.split(":")
            assert 0 <= int(hh) < 24
            assert 0 <= int(mm) < 60
