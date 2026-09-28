"""Dasha parity tests: Vimshottari depth, Yogini, Chara (AstroSage systems)."""

from datetime import datetime, timezone

from app.core.dasha import (
    calculate_chara_dasha,
    calculate_pratyantardashas,
    calculate_yogini_dasha,
    get_current_chara,
    get_current_yogini,
    get_dasha_for_birth,
    YOGINI_SEQUENCE,
)


def test_pratyantardasha_sums_to_antardasha():
    start = datetime(2020, 1, 1, tzinfo=timezone.utc)
    end = datetime(2021, 7, 1, tzinfo=timezone.utc)
    pds = calculate_pratyantardashas(start, end, "Jupiter")
    total = sum(p["duration_days"] for p in pds)
    expected = (end - start).total_seconds() / 86400.0
    assert abs(total - expected) < 2.0
    assert [p["lord"] for p in pds[:3]] == ["Jupiter", "Saturn", "Mercury"]


def test_sookshma_prana_present():
    birth = datetime(1990, 1, 15, 5, 0, tzinfo=timezone.utc)
    now = datetime(2026, 6, 1, tzinfo=timezone.utc)
    info = get_dasha_for_birth(140.0, birth, now)
    cur = info["current_dasha"]
    assert cur is not None
    assert cur.get("sookshma")
    assert cur.get("prana")


def test_yogini_cycle_36_and_start():
    # Moon 1 deg Ashwini (index 0) -> starts at Mangala
    birth = datetime(2000, 1, 1, tzinfo=timezone.utc)
    data = calculate_yogini_dasha(birth, 1.0)
    assert data["periods"][0]["yogini"] == "Mangala"
    assert data["periods"][0]["balance"] is True
    order = [p["yogini"] for p in data["periods"][1:9]]
    assert order == [y[0] for y in YOGINI_SEQUENCE[1:]] + [YOGINI_SEQUENCE[0][0]]
    assert sum(y[1] for y in YOGINI_SEQUENCE) == 36
    # Balance Mangala lasts ~0.925 yr (Moon 1° into Ashwini), so mid-2000 is Mangala.
    cur = get_current_yogini(birth, 1.0, datetime(2000, 6, 1, tzinfo=timezone.utc))
    assert cur["yogini"] == "Mangala"


def test_chara_order_and_durations():
    # Aries lagna (odd-footed): forward from 0
    seq = calculate_chara_dasha(0)
    assert [p["sign"] for p in seq] == list(range(12))
    # Taurus lagna (even-footed): reverse from 1
    seq = calculate_chara_dasha(1)
    assert [p["sign"] for p in seq] == [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    assert all(p["duration_years"] >= 1 for p in seq)
    birth = datetime(1990, 1, 15, tzinfo=timezone.utc)
    cur = get_current_chara(0, birth, datetime(2000, 1, 1, tzinfo=timezone.utc))
    assert cur is not None and "lord" in cur
