"""Endpoints must chart the birth coordinates they were given.

`get_planetary_positions` defaults to Delhi, 28.6139/77.2090. Eight endpoints
called it without passing latitude and longitude, so a birth anywhere else was
charted for Delhi: the ascendant was wrong, and every house placement, sign
count and remedy derived from it. None of this raised an error -- the numbers
came back plausible and belonged to the wrong place.

The two places used here are chosen so the ASCENDANT SIGN differs, not just the
ascendant degree. Delhi and Mumbai happen to share a sign at most hours of the
day, so comparing them would not prove anything.
"""

import pytest

# 1990-05-15 at 01:00 puts the ascendant in Capricorn for Delhi (sign 9) and
# Aquarius for Tokyo (sign 10). The degree differs at nearly every hour; the
# sign only differs at some, so the hour is pinned deliberately.
BIRTH_DATE = "1990-05-15"
BIRTH_TIME = "01:00"

DELHI = {"latitude": 28.6139, "longitude": 77.2090, "timezone_offset": 5.5}
TOKYO = {"latitude": 35.6762, "longitude": 139.6503, "timezone_offset": 9.0}

BASE = {
    "name": "Test", "birth_date": BIRTH_DATE, "birth_time": BIRTH_TIME,
    "birth_place": "Delhi",
}


def _bd(**coords):
    return {**BASE, **DELHI, **coords}


# Endpoints whose output depends on the ascendant, and so on the coordinates.
# Each entry gives the path and a function wrapping the bare BirthData in that
# endpoint's own request shape.
# NOTE: /gemstones/recommend is deliberately absent. It computes `asc_sign`
# from the ascendant and then never reads it -- the recommendation is a fixed
# list for every chart. Passing the coordinates is still correct, but no
# response can differ, so it is not evidence of anything. That the endpoint
# ignores the chart entirely is a separate honesty problem, fixed separately.
ASCENDANT_ENDPOINTS = [
    ("/api/v1/lalkitab/chart", lambda bd: bd),
    ("/api/v1/reports/generate", lambda bd: {"birth_data": bd, "report_type": "brihat_kundli"}),
    ("/api/v1/predictions/generate",
     lambda bd: {"birth_data": bd, "prediction_type": "career"}),
    ("/api/v1/varshphal/calculate", lambda bd: {**bd, "year": 2026}),
]


def test_the_two_places_give_different_ascendant_signs():
    """If this failed, every comparison below would be meaningless."""
    from app.core.planets import get_planetary_positions

    kw = dict(year=1990, month=5, day=15, hour=1, minute=0)
    delhi = get_planetary_positions(**kw, **DELHI)
    tokyo = get_planetary_positions(**kw, **TOKYO)
    assert delhi["asc_sign"] != tokyo["asc_sign"], (delhi["asc_sign"], tokyo["asc_sign"])


def test_planetary_positions_defaults_to_delhi():
    """The default is the source of the bug, so it is asserted explicitly."""
    from app.core.planets import get_planetary_positions

    kw = dict(year=1990, month=5, day=15, hour=1, minute=0)
    assert (
        get_planetary_positions(**kw)["ascendant"]
        == get_planetary_positions(**kw, **DELHI)["ascendant"]
    )


@pytest.mark.parametrize("path,wrap", ASCENDANT_ENDPOINTS)
def test_endpoint_uses_the_supplied_coordinates(client, path, wrap):
    """The same birth, charted for Delhi and for Tokyo, must differ.

    Before the fix both calls fell through to the Delhi default and returned
    identical responses.
    """
    delhi = client.post(path, json=wrap(_bd()))
    tokyo = client.post(path, json=wrap(_bd(**TOKYO)))
    assert delhi.status_code == 200, f"{path} Delhi -> {delhi.text[:300]}"
    assert tokyo.status_code == 200, f"{path} Tokyo -> {tokyo.text[:300]}"
    assert delhi.json() != tokyo.json(), f"{path} ignored the birth coordinates"


def test_lalkitab_ascendant_matches_the_requested_place(client):
    """A direct check on the one field the fix is about."""
    from app.core.planets import get_planetary_positions

    for coords in (DELHI, TOKYO):
        r = client.post("/api/v1/lalkitab/chart", json=_bd(**coords))
        assert r.status_code == 200, r.text
        expected = get_planetary_positions(
            year=1990, month=5, day=15, hour=1, minute=0, **coords
        )
        # The endpoint reports the sign NAME.
        expected_sign = RASHI = [
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ][expected["asc_sign"]]
        assert r.json()["asc_sign"] == expected_sign, coords


def test_lalkitab_houses_are_counted_from_the_real_ascendant(client):
    """House 1 is the ascendant sign; the 12 cells must follow from it."""
    names = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ]
    seen = set()
    for coords in (DELHI, TOKYO):
        body = client.post("/api/v1/lalkitab/chart", json=_bd(**coords)).json()
        start = names.index(body["asc_sign"])
        expected = [names[(start + i) % 12] for i in range(12)]
        # `houses` carries the occupants; the sign of each house is in `chart`.
        actual = [body["chart"][str(i + 1)]["sign"] for i in range(12)]
        assert actual == expected, (coords, actual, expected)
        seen.add(body["asc_sign"])
    assert len(seen) == 2, "Delhi and Tokyo produced the same ascendant sign"


def test_matching_charts_each_person_at_their_own_place(client):
    """Both charts need coordinates; the two are in different countries."""
    r = client.post("/api/v1/matching/analyze", json={
        "boy": _bd(),
        "girl": {
            **_bd(**TOKYO), "name": "Priya", "birth_date": "1992-08-20",
            "birth_time": "14:00", "birth_place": "Tokyo",
        },
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["boy_nakshatra"] is not None
    assert body["girl_nakshatra"] is not None


def test_matching_pdf_uses_the_birth_places(client):
    """The PDF path charts for manglik status through the same helper.

    It also failed outright: `export_matching_pdf` called
    `analyze_marriage_matching` without the request the rate limiter needs, so
    every export raised TypeError and returned a 500.
    """
    r = client.post("/api/v1/matching/export-pdf", json={
        "boy": _bd(),
        "girl": {
            **_bd(**TOKYO), "name": "Priya", "birth_date": "1992-08-20",
            "birth_time": "14:00", "birth_place": "Tokyo",
        },
    })
    assert r.status_code == 200, r.text
    assert r.content.startswith(b"%PDF"), r.content[:8]


def test_transit_today_is_location_independent(client):
    """Transits are planetary, not local: the pinned coordinates are deliberate."""
    r = client.get("/api/v1/transit/today")
    assert r.status_code == 200, r.text
    assert r.json()["transits"]
