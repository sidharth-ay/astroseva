"""Panchang takes a location, so it has to use the whole of it.

Every panchang sub-endpoint computed sunrise from `tz_offset=5.5` regardless of
what was asked for, and `/daily` did not compute sunrise at all: it defaulted
`sunrise_hour=6.0, sunset_hour=18.0` and passed them straight through. The
visible effect was that every city in the app reported an identical sunrise,
and Rahu Kaal and Gulika Kaal -- which are scaled off sunrise and sunset --
were therefore wrong everywhere except by coincidence near Delhi.

These tests compare London against Delhi. A regression to a fixed offset makes
them agree again, which is the whole point.
"""

import pytest

# London in summer (UTC+1), Delhi (UTC+5:30). Same date, opposite ends of the
# offset range.
DELHI = {"latitude": 28.6139, "longitude": 77.2090, "timezone_offset": 5.5}
LONDON = {"latitude": 51.5074, "longitude": -0.1278, "timezone_offset": 1.0}
DATE = "2026-06-15"


def to_minutes(value: str) -> int:
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


@pytest.fixture
def daily_delhi(client):
    response = client.get("/api/v1/panchang/daily",
                          params={**DELHI, "date_str": DATE})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def daily_london(client):
    response = client.get("/api/v1/panchang/daily",
                          params={**LONDON, "date_str": DATE})
    assert response.status_code == 200, response.text
    return response.json()


# --- sunrise is a real, location-specific value -----------------------------

def test_daily_does_not_report_the_placeholder_sunrise(daily_delhi):
    """The old defaults, returned verbatim for every city on earth."""
    assert daily_delhi["sunrise"] != "06:00"
    assert daily_delhi["sunset"] != "18:00"


def test_two_cities_do_not_report_the_same_sunrise(daily_delhi, daily_london):
    assert daily_delhi["sunrise"] != daily_london["sunrise"]
    assert daily_delhi["sunset"] != daily_london["sunset"]


def test_delhi_sunrise_on_this_date_is_plausible(daily_delhi):
    """A near-Delhi location was the one case the old default looked right in.

    Guarding it because a fix that broke Delhi while fixing London would pass
    every comparison above.
    """
    sunrise = to_minutes(daily_delhi["sunrise"])
    # 15 June, Delhi: sunrise is a little after 05:30 IST.
    assert to_minutes("05:00") <= sunrise <= to_minutes("06:15")


def test_london_sunrise_on_this_date_is_plausible(daily_london):
    sunrise = to_minutes(daily_london["sunrise"])
    assert to_minutes("04:00") <= sunrise <= to_minutes("05:30")


def test_sunset_is_after_sunrise_in_both(daily_delhi, daily_london):
    assert daily_delhi["sunrise"] < daily_delhi["sunset"]
    assert daily_london["sunrise"] < daily_london["sunset"]


# --- Rahu Kaal is derived from those hours ----------------------------------

def test_rahu_kaal_is_scaled_to_the_actual_day(daily_delhi, daily_london):
    """Rahu Kaal is a fraction of daylight, not a fixed clock window.

    With sunrise pinned to 06:00 and sunset to 18:00 the window was identical
    for both cities even though their day lengths differ.
    """
    assert daily_delhi["rahu_kaal"] != daily_london["rahu_kaal"]


def test_rahu_kaal_falls_within_the_reported_day(daily_delhi, daily_london):
    for payload in (daily_delhi, daily_london):
        sunrise = to_minutes(payload["sunrise"])
        sunset = to_minutes(payload["sunset"])
        start = to_minutes(payload["rahu_kaal"]["start"])
        end = to_minutes(payload["rahu_kaal"]["end"])
        assert sunrise <= start < end <= sunset, payload["rahu_kaal"]


def test_gulika_kaal_also_falls_within_the_day(daily_delhi, daily_london):
    for payload in (daily_delhi, daily_london):
        sunrise = to_minutes(payload["sunrise"])
        sunset = to_minutes(payload["sunset"])
        assert sunrise <= to_minutes(payload["gulika_kaal"]["start"])
        assert to_minutes(payload["gulika_kaal"]["end"]) <= sunset


# --- the timezone parameter is an input, not a constant ---------------------

def test_the_same_coordinates_at_different_offsets_give_different_hours(client):
    """Isolates the offset from the coordinates: lat/lng held fixed."""
    base = {"latitude": 28.6139, "longitude": 77.2090, "date_str": DATE}
    at_55 = client.get("/api/v1/panchang/daily",
                       params={**base, "timezone_offset": 5.5}).json()
    at_0 = client.get("/api/v1/panchang/daily",
                      params={**base, "timezone_offset": 0.0}).json()
    assert at_55["sunrise"] != at_0["sunrise"]


def test_choghadiya_honours_the_offset_it_was_given(client):
    """The parameter existed in the signature and was silently ignored."""
    london = client.get("/api/v1/panchang/choghadiya", params={
        **LONDON, "date_str": "2026-06-15",
    }).json()
    delhi = client.get("/api/v1/panchang/choghadiya", params={
        **DELHI, "date_str": "2026-06-15",
    }).json()
    assert london["sunrise"] != delhi["sunrise"]


# --- the sun-derived tabs use the coordinates too ---------------------------

def test_choghadiya_is_not_using_a_delhi_sunrise(client):
    """London's 15 June sunrise is before 05:00 BST; Delhi's is after 05:30 IST."""
    body = client.get("/api/v1/panchang/choghadiya", params={
        **LONDON, "date_str": "2026-06-15",
    }).json()
    assert to_minutes(body["sunrise"]) < to_minutes("05:30")


@pytest.mark.parametrize("path", [
    "/api/v1/panchang/hora",
    "/api/v1/panchang/gowri",
    "/api/v1/panchang/ghati",
])
def test_period_tabs_start_from_the_local_sunrise(client, path):
    """Hora, Gowri and ghati windows are all counted from sunrise.

    None of them return a `sunrise` field, so the check is that their first
    period does not start at the Delhi sunrise time for a London request.
    """
    london = client.get(path, params={**LONDON, "date_str": "2026-06-15"}).json()
    delhi = client.get(path, params={**DELHI, "date_str": "2026-06-15"}).json()

    def first_start(payload):
        for key in ("day_hora", "periods", "muhurats", "day_choghadiya"):
            if key in payload and payload[key]:
                return payload[key][0]["start"]
        return None

    start_london, start_delhi = first_start(london), first_start(delhi)
    assert start_london and start_delhi, sorted(london)
    assert start_london != start_delhi, (
        f"{path} computed the same day for London and Delhi"
    )


def test_hora_periods_span_the_london_day(client):
    """With a fixed UTC+5:30 the London day started hours off its sunrise."""
    body = client.get("/api/v1/panchang/hora", params={
        **LONDON, "date_str": "2026-06-15",
    }).json()
    first = body["day_hora"][0]["start"]
    last = body["day_hora"][-1]["end"]
    # London, 15 June: sunrise ~04:45, sunset ~21:20 BST.
    assert to_minutes("04:30") <= to_minutes(first) <= to_minutes("06:30")
    assert to_minutes("19:30") <= to_minutes(last) <= to_minutes("22:00")


def test_the_cache_distinguishes_zones_for_the_same_coordinates(client):
    """Two offsets at one place must not share a cache entry."""
    kwargs = {"latitude": 51.5074, "longitude": -0.1278, "date_str": "2026-06-15"}
    first = client.get("/api/v1/panchang/choghadiya",
                       params={**kwargs, "timezone_offset": 1.0}).json()
    second = client.get("/api/v1/panchang/choghadiya",
                        params={**kwargs, "timezone_offset": 0.0}).json()
    assert first["sunrise"] != second["sunrise"]


def test_the_cache_distinguishes_coordinates(client):
    kwargs = {"timezone_offset": 5.5, "date_str": "2026-06-15"}
    first = client.get("/api/v1/panchang/hora",
                       params={**kwargs, **DELHI}).json()
    second = client.get("/api/v1/panchang/hora",
                        params={**kwargs, **LONDON}).json()
    assert first["day_hora"] != second["day_hora"]


# --- honest failure ----------------------------------------------------------

def test_an_unreachable_day_is_reported_not_invented(client):
    """Polar night must produce a 400, not a fabricated sunrise."""
    response = client.get("/api/v1/panchang/daily", params={
        "latitude": 78.22, "longitude": 15.65,
        "timezone_offset": 1.0, "date_str": "2026-12-21",
    })
    assert response.status_code == 400
    assert "does not rise" in response.json()["detail"]


def test_a_malformed_date_is_a_400_not_a_500(client):
    for path in ("/api/v1/panchang/daily", "/api/v1/panchang/hora"):
        response = client.get(path, params={"date_str": "not-a-date"})
        assert response.status_code == 400, f"{path}: {response.status_code}"


def test_out_of_range_coordinates_are_rejected(client):
    """`Query(ge=-90, le=90)` must not fall back to a default location."""
    response = client.get("/api/v1/panchang/daily", params={
        "latitude": 999, "longitude": 0,
    })
    assert response.status_code == 422
