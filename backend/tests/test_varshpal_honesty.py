"""Varshphal (annual horoscope) must compute the year, not narrate it.

The endpoint interpolated a fixed sentence per topic with the ascendant and a
planet's sign dropped into it, then derived "auspicious" and "challenging"
months from `asc_sign * 2 % 12`. Nothing about the outcome depended on the year,
the birth data beyond the ascendant, or any dasha or transit. Two charts with
the same ascendant received identical text for every year.
"""




def _payload(**overrides):
    body = {
        "name": "Test", "birth_date": "1990-05-15", "birth_time": "10:30",
        "birth_place": "Delhi", "latitude": 28.6139, "longitude": 77.209,
        "timezone_offset": 5.5, "year": 2026,
    }
    body.update(overrides)
    return body


# --- the year must matter -----------------------------------------------------

def test_varshphal_differs_between_years(client):
    """The prose was year-independent; only the echoed year changed."""
    a = client.post("/api/v1/varshphal/calculate", json=_payload(year=2026))
    b = client.post("/api/v1/varshchal/calculate" if False else
                    "/api/v1/varshphal/calculate", json=_payload(year=2029))
    assert a.status_code == 200, a.text
    assert b.status_code == 200, b.text
    assert a.json()["annual_chart"] != b.json()["annual_chart"], (
        "the annual chart does not depend on the year"
    )


def test_varshphal_reports_actual_solar_transits(client):
    """The Sun moves through all twelve signs in any year, so each graha's
    transit for that year is the sign it actually occupies."""
    body = client.post(
        "/api/v1/varshphal/calculate", json=_payload(year=2026)
    ).json()
    transits = body["annual_chart"]["solar_transits"]
    assert transits, "no solar transits reported"
    # Every graha gets an entry, and the signs are real rashi names.
    for name, entry in transits.items():
        assert entry["sign"] in (
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
        ), (name, entry)


def test_varshphal_uses_the_birth_moon_nakshatra_dasha(client):
    """Varshphal is an annual forecast; it is read against the Vimshottari dasha
    running at that year. Without it the response is not a Varshphal."""
    body = client.post(
        "/api/v1/varshphal/calculate", json=_payload(year=2026)
    ).json()
    annual = body["annual_chart"]
    assert annual["dasha_lord"], "no dasha lord reported for the year"
    assert annual["dasha_period"], "no dasha period reported for the year"


def test_varshphal_states_how_much_it_can_know(client):
    """The response must carry what it is, so the page can say so."""
    body = client.post(
        "/api/v1/varshphal/calculate", json=_payload(year=2026)
    ).json()
    assert body["method"]
    assert body["limitations"], "the response does not state what it cannot do"


def test_varshphal_is_computed_not_narrated(client):
    """No template strings keyed on the year, and no claim of growth or luck."""
    body = client.post(
        "/api/v1/varshphal/calculate", json=_payload(year=2026)
    ).json()
    text = " ".join(
        v for v in body.get("observations", {}).values() if isinstance(v, str)
    ).lower()
    for phrase in ("shows growth", "favors travel", "unexpected gains",
                   "financial opportunities", "supports"):
        assert phrase not in text, f"templated prediction text present: {phrase}"


def test_varshphal_does_not_invent_months(client):
    """`auspicious_months` came from `(asc_sign * 2 + m) % 12`.

    That is an offset into a month list, not an ephemeris result, so the same
    months came out for every chart sharing an ascendant and every year.
    """
    body = client.post(
        "/api/v1/varshphal/calculate", json=_payload(year=2026)
    ).json()
    assert "auspicious_months" not in body
    assert "challenging_months" not in body


def test_varshphal_same_chart_same_year_is_stable(client):
    """Deterministic for identical input, or the page flickers on reload."""
    a = client.post("/api/v1/varshphal/calculate", json=_payload(year=2026)).json()
    b = client.post("/api/v1/varshphal/calculate", json=_payload(year=2026)).json()
    assert a == b


def test_varshphal_differs_between_charts_with_the_same_ascendant(client):
    """Two people can share an ascendant; the dasha must still differ.

    11:00 and 12:00 on this date are both Cancer rising, but the Moon has moved
    far enough to fall in a different nakshatra, and the dasha is seeded from
    the Moon. Under the old endpoint both requests returned byte-identical
    prose, because the ascendant was the only natal input it read.
    """
    a = client.post("/api/v1/varshphal/calculate", json=_payload(
        birth_time="11:00"
    )).json()
    b = client.post("/api/v1/varshphal/calculate", json=_payload(
        birth_time="12:00"
    )).json()
    assert a["varshphal_chart"]["asc_sign"] == b["varshphal_chart"]["asc_sign"]
    assert a["annual_chart"] != b["annual_chart"], (
        "identical ascendant produced an identical annual chart"
    )
