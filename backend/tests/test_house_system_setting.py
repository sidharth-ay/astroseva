"""house_system is a stored setting, and every chart endpoint honours it.

`get_house_from_longitude` already supported "whole-sign" and "equal", but no
caller ever passed anything: all seven call sites used the default, so there
was no way for a user to choose. Two consequences these tests pin down:

  * The setting is read per request and cached alongside every other
    result-affecting input, so switching it cannot serve a chart computed
    under the other system.
  * It actually changes the answer. A setting that is stored and returned but
    never reaches the calculation would be worse than no setting at all.

`fake_user` is always id 1, so a row written here would leak into every later
test in the session and silently move them to equal houses; the autouse
fixture removes it on both sides.
"""

import uuid

import pytest

from app.api.kundli import _generate_kundli_data
from app.core.houses import DEFAULT_HOUSE_SYSTEM, HOUSE_SYSTEMS, get_house_from_longitude
from app.db.models import UserSettings
from app.models.birth_data import BirthData
from app.services.settings_service import get_house_system, set_house_system

WHOLE_SIGN, EQUAL = HOUSE_SYSTEMS


@pytest.fixture(autouse=True)
def clean_settings(db_session):
    """A settings row must not outlive the test that wrote it."""
    db_session.query(UserSettings).delete()
    db_session.commit()
    yield
    db_session.query(UserSettings).delete()
    db_session.commit()


def _payload():
    """A chart the kundli cache has never seen, so both settings recompute."""
    return {
        "name": "House System",
        "birth_date": "1990-06-15",
        "birth_time": "10:30",
        "birth_place": "New Delhi, India",
        "latitude": 28.6139 + (int(uuid.uuid4().int) % 900) / 1000.0,
        "longitude": 77.2090,
        "timezone_offset": 5.5,
    }


def _birth_data():
    return BirthData(**{
        k: v for k, v in _payload().items()
        if k in ("name", "birth_date", "birth_time", "birth_place",
                 "latitude", "longitude", "timezone_offset")
    })


# ---------------------------------------------------------------------------
# The service
# ---------------------------------------------------------------------------

def test_missing_row_means_the_default(db_session):
    assert get_house_system(db_session, 1) == DEFAULT_HOUSE_SYSTEM


def test_a_stored_value_round_trips(db_session):
    assert set_house_system(db_session, 1, EQUAL) == EQUAL
    assert get_house_system(db_session, 1) == EQUAL


def test_unknown_user_falls_back_to_the_default(db_session):
    set_house_system(db_session, 1, EQUAL)
    assert get_house_system(db_session, 999) == DEFAULT_HOUSE_SYSTEM
    assert get_house_system(db_session, None) == DEFAULT_HOUSE_SYSTEM


def test_an_unrecognised_stored_value_is_not_returned(db_session):
    """A row from before a value was withdrawn must not reach the engine."""
    db_session.add(UserSettings(user_id=1, house_system="placidus"))
    db_session.commit()
    assert get_house_system(db_session, 1) == DEFAULT_HOUSE_SYSTEM


def test_the_service_rejects_an_unknown_value(db_session):
    with pytest.raises(ValueError):
        set_house_system(db_session, 1, "placidus")
    assert get_house_system(db_session, 1) == DEFAULT_HOUSE_SYSTEM


def test_saving_twice_updates_the_same_row(db_session):
    set_house_system(db_session, 1, EQUAL)
    set_house_system(db_session, 1, WHOLE_SIGN)
    assert db_session.query(UserSettings).filter_by(user_id=1).count() == 1
    assert get_house_system(db_session, 1) == WHOLE_SIGN


# ---------------------------------------------------------------------------
# The endpoint
# ---------------------------------------------------------------------------

def test_read_returns_the_default_before_anything_is_saved(client):
    resp = client.get("/api/v1/settings")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["house_system"] == DEFAULT_HOUSE_SYSTEM
    assert body["default_house_system"] == DEFAULT_HOUSE_SYSTEM
    assert set(body["house_systems"]) == set(HOUSE_SYSTEMS)


def test_write_is_read_back(client):
    resp = client.put("/api/v1/settings", json={"house_system": EQUAL})
    assert resp.status_code == 200, resp.text
    assert resp.json()["house_system"] == EQUAL

    assert client.get("/api/v1/settings").json()["house_system"] == EQUAL


def test_write_rejects_a_system_the_engine_cannot_compute(client):
    resp = client.put("/api/v1/settings", json={"house_system": "placidus"})
    assert resp.status_code == 422, resp.text
    assert "whole-sign" in resp.json()["detail"]
    # Nothing was stored by the rejected write.
    assert client.get("/api/v1/settings").json()["house_system"] == DEFAULT_HOUSE_SYSTEM


def test_missing_field_is_a_validation_error(client):
    assert client.put("/api/v1/settings", json={}).status_code == 422


# ---------------------------------------------------------------------------
# It reaches the calculation
# ---------------------------------------------------------------------------

def test_the_two_systems_disagree_for_the_same_chart():
    """If this ever stops differing, the setting has stopped doing anything."""
    bd = _birth_data()
    whole = _generate_kundli_data(bd, house_system=WHOLE_SIGN)
    equal = _generate_kundli_data(bd, house_system=EQUAL)

    whole_houses = [p.house for p in whole["planets"]]
    equal_houses = [p.house for p in equal["planets"]]
    assert whole_houses != equal_houses

    # And each matches the function it names.
    asc = whole["positions"]["ascendant"]
    for planet, ws, eq in zip(whole["planets"], whole_houses, equal_houses, strict=True):
        assert ws == get_house_from_longitude(planet.longitude, asc, WHOLE_SIGN)
        assert eq == get_house_from_longitude(planet.longitude, asc, EQUAL)


def test_the_kundli_endpoint_follows_the_stored_setting(client, db_session):
    payload = _payload()

    first = client.post("/api/v1/kundli/generate", json=payload)
    assert first.status_code == 200, first.text
    assert first.json()["planets"][0]["house"] is not None

    set_house_system(db_session, 1, EQUAL)
    second = client.post("/api/v1/kundli/generate", json=payload)
    assert second.status_code == 200, second.text

    set_house_system(db_session, 1, WHOLE_SIGN)
    third = client.post("/api/v1/kundli/generate", json=payload)

    def by_house(body):
        return [(p["planet"], p["house"]) for p in body["planets"]]

    # The cache must not hand back the answer from the other system.
    assert by_house(second.json()) != by_house(third.json())
    assert by_house(first.json()) == by_house(third.json())


def test_dosha_detection_accepts_either_system(client, db_session):
    """The doshas router is gated the same way; both settings must stay live.

    The detect response does not surface per-planet houses, so the observable
    contract here is that the endpoint keeps answering under both systems --
    the house maths itself is pinned by `_planets_with_houses` below.
    """
    payload = _payload()

    set_house_system(db_session, 1, WHOLE_SIGN)
    whole = client.post("/api/v1/doshas/detect", json=payload)
    assert whole.status_code == 200, whole.text

    set_house_system(db_session, 1, EQUAL)
    equal = client.post("/api/v1/doshas/detect", json=payload)
    assert equal.status_code == 200, equal.text

    assert set(whole.json()) == set(equal.json())


def test_the_chat_context_reaches_the_house_calculation():
    """Chat builds its own chart summary, four calls deep from the endpoint.

    The cascade (`send_chat_message` -> `generate_chat_response` ->
    `handle_*_intent` -> `compute_chat_birth_context`) is where a setting
    silently stops applying, so the context text is compared directly.
    """
    from app.api.chat import compute_chat_birth_context

    details = {
        "name": "Chat Reader",
        "birth_year": 1988,
        "birth_month": 11,
        "birth_day": 3,
        "birth_hour": 4.75,
        "birth_minute": 0,
        "latitude": 23.0844,
        "longitude": 72.5137,
        "timezone_offset": 5.5,
    }
    whole = compute_chat_birth_context(dict(details), WHOLE_SIGN)
    equal = compute_chat_birth_context(dict(details), EQUAL)

    assert whole, "context should not be empty for a complete birth record"
    assert whole != equal, "chat still ignores the saved house system"

    # The chat endpoint resolves the setting and hands it down.
    from app.api.chat import generate_chat_response, send_chat_message
    import inspect

    params = inspect.signature(send_chat_message).parameters
    assert "house_system" in params, "chat endpoint does not accept the setting"
    assert params["house_system"].default.__class__.__name__ == "Depends"
    assert "house_system" in inspect.signature(generate_chat_response).parameters


def test_planets_with_houses_uses_the_given_system():
    from app.api.doshas import _planets_with_houses

    # A fresh dict each call: the helper writes `house` onto the planet dicts
    # it is given, so sharing the list would let the second call overwrite the
    # first and make the two systems agree by construction.
    def positions():
        return {
            "ascendant": 100.0,  # 10 degrees into the 4th sign
            "planets": [
                {"planet": "Mars", "longitude": 95.0},     # just before the Lagna
                {"planet": "Saturn", "longitude": 185.0},  # crosses a sign boundary
            ],
        }

    whole = {p["planet"]: p["house"] for p in _planets_with_houses(positions(), WHOLE_SIGN)[0]}
    equal = {p["planet"]: p["house"] for p in _planets_with_houses(positions(), EQUAL)[0]}

    # Mars sits in the same sign as the Lagna but behind it: whole-sign counts
    # it as the 1st house, equal-house puts it in the 12th.
    assert whole["Mars"] == 1
    assert equal["Mars"] == 12
    assert whole != equal

    for planet, longitude in (("Mars", 95.0), ("Saturn", 185.0)):
        assert whole[planet] == get_house_from_longitude(longitude, 100.0, WHOLE_SIGN)
        assert equal[planet] == get_house_from_longitude(longitude, 100.0, EQUAL)
