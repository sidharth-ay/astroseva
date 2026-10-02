"""Panchang sub-endpoints: /monthly, /hora, /muhurat, and the sun times.

The defects here were all silent -- nulls and stale constants rather than
errors.
"""

import pytest


def test_monthly_panchang_has_real_values_not_nulls(client):
    """Every field came back null for every day of every month.

    `get_panchang` returns a dict, but the summary was assembled with
    `getattr(panchang, "tithi", None)` and friends. `getattr` is always None on
    a dict, and a bare `except Exception: pass` swallowed what was left, so
    /monthly returned 30-31 rows of nulls with a plausible shape.
    """
    r = client.get("/api/v1/panchang/monthly?year=2026&month=3")
    assert r.status_code == 200, r.text
    days = r.json()["days"]
    assert len(days) == 31
    for d in days:
        assert d["tithi"], d["date"]
        assert d["nakshatra"], d["date"]
        assert d["yoga"], d["date"]
        assert d["karana"], d["date"]
        assert d["vara"], d["date"]


def test_monthly_panchang_tithi_names_are_real(client):
    r = client.get("/api/v1/panchang/monthly?year=2026&month=3")
    names = {d["tithi"]["tithi_name"] for d in r.json()["days"] if d["tithi"]}
    assert len(names) > 5, names
    assert all(isinstance(n, str) and n for n in names)


def test_hora_splits_day_and_night_without_overlap(client):
    """All 24 periods were returned as day_hora, night ones included.

    The filter was `"day" not in p or p.get("period") == "day"`, but the dicts
    have a "period" key and no "day" key, so the first clause was true for
    every period and day_hora came back with 24 entries instead of 12.
    """
    r = client.get("/api/v1/panchang/hora?date_str=2026-03-11")
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["day_hora"]) == 12, len(body["day_hora"])
    assert len(body["night_hora"]) == 12, len(body["night_hora"])
    assert {p["period"] for p in body["day_hora"]} == {"day"}
    assert {p["period"] for p in body["night_hora"]} == {"night"}


def test_hora_day_periods_tile_the_daylight(client):
    """Day horas must run sunrise to sunset with no gaps or overlaps."""
    r = client.get("/api/v1/panchang/hora?date_str=2026-03-11")
    day = r.json()["day_hora"]
    for earlier, later in zip(day, day[1:], strict=False):
        assert earlier["end"] == later["start"], (earlier, later)


@pytest.mark.parametrize("endpoint", [
    "/api/v1/panchang/hora",
    "/api/v1/panchang/choghadiya",
    "/api/v1/panchang/ghati",
    "/api/v1/panchang/gowri",
    "/api/v1/panchang/muhurat",
])
def test_panchang_endpoints_reject_a_bad_date_with_400(client, endpoint):
    """A malformed date is a client error, not a server error."""
    r = client.get(f"{endpoint}?date_str=not-a-date")
    assert r.status_code == 400, f"{endpoint} returned {r.status_code}"
    assert "date" in r.json()["detail"].lower()


def test_muhurat_does_not_turn_a_bad_date_into_a_500(client):
    """The bare `except Exception` relabelled a 400 as "Error calculating"."""
    r = client.get("/api/v1/panchang/muhurat?date_str=31-31-2026")
    assert r.status_code == 400, r.text
    assert "error calculating" not in r.json()["detail"].lower()


def test_sun_times_respond_to_longitude_not_just_latitude(client):
    """The old formula ignored longitude, so it returned the same sunrise for
    two places at the same latitude but very different longitudes."""
    delhi = client.get(
        "/api/v1/panchang/choghadiya?date_str=2026-03-11&latitude=28.6139&longitude=77.209"
    ).json()
    # Kolkata sits near the same latitude but ~12 degrees east in longitude.
    kolkata = client.get(
        "/api/v1/panchang/choghadiya?date_str=2026-03-11&latitude=22.5726&longitude=88.3639"
    ).json()
    assert delhi["sunrise"] != "06:00" or delhi["sunset"] != "18:00"
    assert kolkata["sunrise"] != delhi["sunrise"]


def test_panchang_polar_latitude_is_a_clear_400(client):
    """Svalbard in December: the sun does not rise, so no hora exists."""
    r = client.get(
        "/api/v1/panchang/hora?date_str=2026-12-21&latitude=78.22&longitude=15.65"
    )
    assert r.status_code == 400, r.text
    assert "rise" in r.json()["detail"].lower()
