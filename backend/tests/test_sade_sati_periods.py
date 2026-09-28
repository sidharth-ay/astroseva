"""Parity tests for the Sade Sati period scanner.

Published Sade Sati tables give a rising / peak / setting triple spaced about
2.5 years apart, repeating roughly every 29.5 years. These tests assert that
structure plus a handful of ingress dates anchored to Saturn's sidereal sign
changes, which are fixed by the ephemeris rather than by convention.
"""

import datetime as dt

import pytest

from app.core.doshas import get_sade_sati_periods
from app.core.planets import get_sidereal_longitude


def _phase_order(periods):
    return [p["phase"] for p in periods if not p["partial"]]


def test_cancer_moon_matches_published_windows():
    """Cancer Moon: 2002-2009 and 2032-2038 rising/peak/setting triples."""
    periods = get_sade_sati_periods(3, 1950, 2053)

    # 1973, 2002 and 2032 rising phases, each followed by peak and setting.
    assert _phase_order(periods) == [
        "Rising", "Peak", "Setting",
        "Rising", "Peak", "Setting",
        "Rising", "Peak", "Setting",
    ]

    by_start = {p["start"]: p for p in periods if not p["partial"]}
    assert by_start["2002-07-23"]["phase"] == "Rising"
    assert by_start["2002-07-23"]["end"] == "2004-09-05"
    assert by_start["2004-09-06"]["phase"] == "Peak"
    assert by_start["2006-11-01"]["phase"] == "Setting"
    assert by_start["2006-11-01"]["end"] == "2009-09-09"


def test_aquarius_moon_2020_2027_window():
    periods = get_sade_sati_periods(10, 1950, 2053)
    triples = [
        (p["phase"], p["start"], p["end"])
        for p in periods
        if not p["partial"] and "2019-01-01" <= p["start"] <= "2028-12-31"
    ]
    assert triples == [
        ("Rising", "2020-01-24", "2022-04-28"),
        ("Peak", "2022-04-29", "2025-03-29"),
        ("Setting", "2025-03-30", "2027-06-02"),
    ]


def test_ingress_day_matches_sidereal_sign_change():
    """Each ingress is the day Saturn's sidereal sign actually changes."""
    for moon_sign in (0, 3, 7, 10):
        for period in get_sade_sati_periods(moon_sign, 1950, 2053):
            if period["partial"]:
                continue
            start = dt.date.fromisoformat(period["start"])
            # Saturn's sidereal longitude must be in the new sign on the
            # ingress day, and in the preceding sign the day before.
            lon = get_sidereal_longitude("Saturn", start.year, start.month, start.day)
            assert int(lon // 30) % 12 == period["saturn_sign"]
            prev = start - dt.timedelta(days=1)
            prev_lon = get_sidereal_longitude(
                "Saturn", prev.year, prev.month, prev.day)
            assert int(prev_lon // 30) % 12 != period["saturn_sign"]


def test_phases_are_contiguous_and_ordered():
    for moon_sign in range(12):
        periods = get_sade_sati_periods(moon_sign, 1950, 2053)
        real = [p for p in periods if not p["partial"]]
        for earlier, later in zip(real, real[1:]):
            assert dt.date.fromisoformat(later["start"]) > \
                dt.date.fromisoformat(earlier["end"])
        for period in real:
            assert dt.date.fromisoformat(period["end"]) > \
                dt.date.fromisoformat(period["start"])


def test_phase_lengths_roughly_match_saturn_transit():
    """Each phase lasts about 2.5 years; allow a year of slack."""
    for moon_sign in range(12):
        for period in get_sade_sati_periods(moon_sign, 1950, 2053):
            if period["partial"]:
                continue
            span = (dt.date.fromisoformat(period["end"])
                    - dt.date.fromisoformat(period["start"])).days
            assert 600 < span < 1400, (moon_sign, period)


def test_retrograde_excursions_do_not_create_windows():
    """Saturn retrogrades across Gemini in early 2003; no bogus window there."""
    periods = get_sade_sati_periods(3, 1998, 2010)
    starts = [p["start"] for p in periods if not p["partial"]]
    # Real Sade Sati for a Cancer Moon runs 2002-07 to 2009-09 as one triple.
    assert starts == ["2002-07-23", "2004-09-06", "2006-11-01"]


def test_ephemeris_limit_does_not_raise():
    """Asking past DE421s' 2053-10-09 limit returns partial rows, not an error."""
    periods = get_sade_sati_periods(10, 2040, 2061)
    assert periods
    assert periods[-1]["partial"] is True
    assert periods[-1]["end"] <= "2053-10-09"
