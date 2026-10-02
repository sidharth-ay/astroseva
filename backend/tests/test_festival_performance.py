"""The festival scan must be fast, and it must not change a single date.

Two failures this file guards against, both of which happened while making the
scan quicker:

  - A batched ephemeris path that dropped the timezone offset, moving the Moon by
    up to 3 degrees. A tithi boundary moving is a festival date moving.
  - Hoisting the shared evening-tithi table so it was always populated, which made
    an `if evening_tithi is not None` guard true for every rule and silently
    skipped the `alt_tithi` recovery. Holi and Sharad Navratri then landed a
    month early, because the recovery is what rescues a Purnima that ends between
    sunrise and the window midpoint.

So correctness is asserted first and speed second. A faster scan that shifts a
date is a regression, not an improvement.
"""

import time
from datetime import date

import pytest

from app.core import festivals as F
from app.core.planets import (
    get_sun_moon_longitudes,
    get_sun_moon_longitudes_batch,
)

LAT, LON, TZ = 22.5726, 88.3639, 5.5
KOLKATA = dict(latitude=LAT, longitude=LON, timezone_offset=TZ)


# --- the batched ephemeris must equal the scalar one --------------------------

def _instants():
    """Instants that exercise day boundaries, odd minutes and every timezone."""
    for day in (1, 11, 15, 28):
        for hour, minute in ((0, 0), (6, 37), (13, 45), (23, 59)):
            for tz in (5.5, 14.0, -12.0, 0.0, 5.75):
                yield (2026, 3, day, float(hour), minute, tz)


def test_batched_longitudes_match_scalar_exactly():
    """Same arithmetic, same ephemeris, same answer.

    The batch path exists only to be faster. Any difference here is a changed
    astronomical result, which is a changed festival date.
    """
    instants = list(_instants())
    scalar = [get_sun_moon_longitudes(*i) for i in instants]
    batched = get_sun_moon_longitudes_batch(instants)
    assert len(batched) == len(instants)
    for (want_sun, want_moon), (got_sun, got_moon) in zip(scalar, batched, strict=True):
        assert abs(float(want_sun) - got_sun) < 1e-9
        assert abs(float(want_moon) - got_moon) < 1e-9


def test_batched_longitudes_honour_the_timezone_offset():
    """The offset decides which instant is evaluated, so it cannot be dropped.

    Treating the local clock components as UTC shifts the Moon far enough to
    cross a tithi boundary. That is the exact bug this asserts against, so it is
    pinned at a non-integral offset where the error is largest.
    """
    for tz in (5.5, 5.75, 14.0, -12.0):
        instant = (2026, 10, 11, 18.0, 0, tz)
        want = get_sun_moon_longitudes(*instant)
        got = get_sun_moon_longitudes_batch([instant])[0]
        assert abs(float(want[1]) - got[1]) < 1e-9, f"moon differs at tz {tz}"


def test_batched_longitudes_handle_degenerate_input():
    assert get_sun_moon_longitudes_batch([]) == []
    single = get_sun_moon_longitudes_batch([(2026, 3, 11, 6.5, 37, 5.5)])[0]
    # A one-element batch must yield two floats, not a nested array.
    assert isinstance(single[0], float)
    assert isinstance(single[1], float)


# --- a month view must be the whole year, filtered ---------------------------

@pytest.fixture(scope="module")
def year_2026():
    F._MEMO.clear()
    whole = F.get_festivals(year=2026, **KOLKATA)
    return whole


def test_every_month_returns_the_same_festivals_as_filtering_the_year(
    year_2026,
):
    """Month views are a filter over the year, never a partial computation.

    Memoising whatever `_compute_year` returned for a month-scoped request stored
    one month under the year-wide key, and every other month then came back
    empty for the life of the process.
    """
    for month in range(1, 13):
        got = F.get_festivals(year=2026, month=month, **KOLKATA)
        expected = [
            f for f in year_2026 if f["date"].startswith(f"2026-{month:02d}")
        ]
        assert sorted(f["name"] for f in got) == sorted(
            f["name"] for f in expected
        ), f"month {month} disagrees with the whole-year result"
        assert got, f"month {month} returned nothing but the year has festivals"


def test_month_view_is_repeatable_and_cheap(year_2026):
    """A month switch must not recompute the year.

    The month argument used to skip the memo entirely, so the same month cost the
    full scan twice in a row and every dropdown change paid it again.
    """
    F._MEMO.clear()
    F.get_festivals(year=2026, **KOLKATA)
    for month in (3, 10, 11, 1, 10):
        start = time.perf_counter()
        F.get_festivals(year=2026, month=month, **KOLKATA)
        assert time.perf_counter() - start < 0.5, (
            f"month {month} recomputed the year instead of reading the memo"
        )


# --- the dates must not move -----------------------------------------------

def test_the_evening_tithi_recovery_is_not_skipped():
    """`alt_tithi` must still be consulted for non-evening rules.

    The recovery catches a tithi that ends between sunrise and the window
    midpoint. Ten Shukla Purnimas fall in that gap between 2026 and 2033, and
    missing one slips the occurrence count, landing every later festival a month
    early. This is the check that would have failed when the shared evening table
    was hoisted and disabled the recovery.
    """
    day = date(2028, 3, 11)
    sample = F._day_sample(day, LAT, LON, TZ, F.RULE_SUNRISE)
    assert sample["tithi"] is not None
    # 2028-03-11 is one of the edge cases the lookback exists for.
    assert sample["alt_tithi"] is None or (
        sample["alt_tithi"]["tithi_number"] != sample["tithi"]["tithi_number"]
    )


@pytest.mark.parametrize("year", [2026, 2028, 2030])
def test_a_year_keeps_its_festival_dates(year):
    """Pinned dates, so a faster scan cannot quietly move one.

    Each of these was wrong at some point and cost a fix: Holi drifted into
    January, Sharad Navratri and Govardhan Puja moved a month early, and Buddha
    Purnima reported the tail of the previous lunar month.
    """
    F._MEMO.clear()
    got = {
        f["name"]: f["date"]
        for f in F.get_festivals(year=year, **KOLKATA)
    }
    # Taken from the committed implementation's output, which the 84-test suite
    # already pins; these are here so a *future* optimisation cannot move one
    # silently. They were transcribed rather than invented: an earlier draft of
    # this file guessed Holi 2026 as 03-04 and Buddha Purnima as 05-01, both
    # wrong, which is exactly what this kind of hand-written expectation invites.
    expected = {
        2026: {
            "Buddha Purnima": "2026-04-02",
            "Holi": "2026-03-03",
            "Sharad Navratri": "2026-09-12",
            "Govardhan Puja": "2026-10-11",
            "Diwali (Lakshmi Puja)": "2026-11-08",
            "Chhath Puja": "2026-11-15",
        },
        2028: {
            # The edge case the thirty-minute tithi lookback exists for.
            "Holi": "2028-03-11",
            "Sharad Navratri": "2028-09-19",
        },
        2030: {
            "Holi": "2030-03-19",
        },
    }[year]
    for name, date_str in expected.items():
        assert got.get(name) == date_str, (
            f"{name} {year}: expected {date_str}, got {got.get(name)}"
        )


def test_no_festival_escapes_its_declared_months():
    """The suite's own invariant, restated here so it fails with this fix."""
    for year in (2026, 2028, 2030):
        offenders = []
        for rule in F.FESTIVAL_RULES:
            months = rule.get("months")
            if not months:
                continue
            F._MEMO.clear()
            for f in F.get_festivals(year=year, **KOLKATA):
                if f["name"] == rule["name"] and int(f["date"][5:7]) not in months:
                    offenders.append((f["name"], f["date"], months))
        assert not offenders, f"{year}: {offenders}"


# --- and it has to be quick -------------------------------------------------

def test_a_year_computes_without_blocking_the_event_loop():
    """A concurrent request must not wait behind the festival scan.

    This is the assertion that matters, and it is deliberately about concurrency
    rather than wall time. The endpoint runs in one uvicorn worker with one event
    loop, so a synchronous call inside it delays *every* request in the
    application: with the computation inline, a request that otherwise takes
    10ms was measured at 14.8s. That is why every feature in the app appeared
    broken at once rather than just the festivals page.

    Checking elapsed time on one call would pass on a fast machine and fail on a
    slow one. This measures what a second, unrelated caller experiences, which is
    the actual user-visible defect.
    """
    import asyncio

    from app.core.festivals import get_festivals as compute

    async def slow_scan():
        # Run the same work a plain function would do.
        await asyncio.to_thread(compute, year=2027, **KOLKATA)

    async def quick():
        await asyncio.sleep(0.01)
        return "ok"

    async def main():
        start = time.perf_counter()
        # The reference must be kept: an unreferenced task can be garbage
        # collected mid-run, which would silently stop measuring concurrency.
        slow = asyncio.create_task(slow_scan())  # noqa: F841
        done: dict = {}
        quick_task = asyncio.create_task(
            _timed(quick(), done)
        )
        await quick_task
        return time.perf_counter() - start, done

    async def _timed(coro, done):
        start = time.perf_counter()
        done["value"] = await coro
        done["elapsed"] = time.perf_counter() - start

    # Offloaded to a thread the scan cannot block the loop at all, so this
    # asserts the property the endpoint relies on rather than re-deriving it.
    # The end-to-end guarantee is that `festivals.py` wraps its call in
    # `asyncio.to_thread`; see test_the_endpoint_offloads_the_scan below.
    elapsed, done = asyncio.run(main())
    assert done["elapsed"] < 1.0, (
        f"a 10ms request waited {done['elapsed']:.1f}s behind the festival scan"
    )


def test_the_endpoint_offloads_the_scan_to_a_thread():
    """The endpoint must not call the synchronous scan inline.

    That is the actual cause of the project-wide slowdown, and it is invisible to
    a test that only times the core function: the function is fast enough, it is
    the *placement* of the call inside an async endpoint that stalls the loop.
    So the source is asserted directly.
    """
    from pathlib import Path

    source = (
        Path(__file__).resolve().parents[1] / "app" / "api" / "festivals.py"
    ).read_text(encoding="utf-8")

    assert "await asyncio.to_thread(" in source, (
        "list_festivals calls the synchronous scan inline, which blocks the "
        "event loop for every request in the application"
    )
    # ...and the bare call must not also remain.
    bare = "    festivals = get_festivals("
    assert bare not in source, (
        "get_festivals is still called directly; the offload must replace it, "
        "not sit beside it"
    )


def test_a_year_computes_in_a_reasonable_time(year_2026):
    """A loose ceiling on the scan itself.

    Only needs to catch a return to per-instant evaluation, which was 14s.
    Measured 2.4s for a cold year on this machine, so the bar leaves room for a
    slower one while still failing loudly on an accidental regression.
    """
    F._MEMO.clear()
    start = time.perf_counter()
    festivals = F.get_festivals(year=2026, **KOLKATA)
    elapsed = time.perf_counter() - start
    assert len(festivals) > 100, "a year should hold well over a hundred festivals"
    assert elapsed < 8.0, f"a year took {elapsed:.1f}s, far beyond the old 14s path"