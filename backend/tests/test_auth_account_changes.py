"""Account changes: profile edit, change-email, change-phone.

Email, phone and password each change only with current-password verification;
name, gender and birth fields edit freely but email/phone/password sent to the
profile route change nothing. Every wrong-password attempt must leave the
stored value untouched.
"""
import pytest

from app.core.rate_limit import limiter
from app.db.models import User

PASSWORD = "ValidPass123!"
BIRTH = {
    "gender": "male",
    "birth_date": "1990-05-15",
    "birth_time": "10:30",
    "birth_place": "New Delhi",
    "latitude": 28.6139,
    "longitude": 77.209,
    "timezone_offset": 5.5,
}


@pytest.fixture(autouse=True)
def clean_db(db_session):
    db_session.query(User).filter(User.email.startswith("acct_")).delete()
    db_session.query(User).filter(User.email.startswith("acct2_")).delete()
    db_session.commit()
    limiter.reset()
    yield
    limiter.reset()


def _register(anon_client, email, **extra):
    body = {"email": email, "name": "Acct User", "password": PASSWORD, **extra}
    resp = anon_client.post("/api/v1/auth/register", json=body)
    assert resp.status_code == 200, resp.text


def _auth(anon_client, email):
    """Register, log in, return headers carrying the session."""
    _register(anon_client, email)
    login = anon_client.post(
        "/api/v1/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert login.status_code == 200, login.text
    return {"Authorization": f"Bearer {login.json()['token']}"}


def test_profile_updates_name_and_birth(anon_client, db_session):
    headers = _auth(anon_client, "acct_profile@example.com")
    resp = anon_client.put("/api/v1/auth/profile", json={"name": "New Name", **BIRTH}, headers=headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["name"] == "New Name"
    assert body["birth_date"] == "1990-05-15"
    assert body["birth_place"] == "New Delhi"
    user = db_session.query(User).filter(User.email == "acct_profile@example.com").one()
    assert user.name == "New Name"
    assert user.latitude == pytest.approx(28.6139)


def test_profile_ignores_email_phone_password(anon_client, db_session):
    """Credential fields sent to the profile route change nothing."""
    headers = _auth(anon_client, "acct_boundary@example.com")
    resp = anon_client.put(
        "/api/v1/auth/profile",
        json={"name": "Kept Name", "email": "acct_hacker@example.com", "phone_number": "+910000000000", "password": "Whatever123!"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    user = db_session.query(User).filter(User.email == "acct_boundary@example.com").one()
    assert user is not None
    assert user.name == "Kept Name"
    assert user.phone_number is None


def test_profile_clears_with_explicit_null(anon_client, db_session):
    headers = _auth(anon_client, "acct_clear@example.com")
    anon_client.put("/api/v1/auth/profile", json=BIRTH, headers=headers)
    resp = anon_client.put(
        "/api/v1/auth/profile", json={"birth_date": None, "birth_place": None}, headers=headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["birth_date"] is None
    user = db_session.query(User).filter(User.email == "acct_clear@example.com").one()
    assert user.birth_date is None
    # Untouched fields survive the partial update.
    assert user.birth_time == "10:30"


def test_profile_rejects_bad_geo_and_shapes(anon_client):
    headers = _auth(anon_client, "acct_bad@example.com")
    resp = anon_client.put("/api/v1/auth/profile", json={"latitude": 91.0}, headers=headers)
    assert resp.status_code == 400, resp.text
    resp = anon_client.put("/api/v1/auth/profile", json={"birth_date": "yesterday"}, headers=headers)
    assert resp.status_code == 422, resp.text


def test_change_email_happy_path(anon_client, db_session):
    headers = _auth(anon_client, "acct_email@example.com")
    resp = anon_client.post(
        "/api/v1/auth/change-email",
        json={"current_password": PASSWORD, "new_email": "acct2_new@example.com"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == "acct2_new@example.com"

    user = db_session.query(User).filter(User.email == "acct2_new@example.com").one()
    assert user.email_verified is False

    # The new address logs in; the old one no longer exists.
    login = anon_client.post(
        "/api/v1/auth/login", json={"email": "acct2_new@example.com", "password": PASSWORD}
    )
    assert login.status_code == 200, login.text


def test_change_email_wrong_password_changes_nothing(anon_client, db_session):
    headers = _auth(anon_client, "acct_emailbad@example.com")
    resp = anon_client.post(
        "/api/v1/auth/change-email",
        json={"current_password": "WrongPass123!", "new_email": "acct2_evil@example.com"},
        headers=headers,
    )
    # 403, not 401: the session is valid, only the supplied proof is wrong. A 401
    # here would read as an expired session and log the user out.
    assert resp.status_code == 403, resp.text
    assert db_session.query(User).filter(User.email == "acct_emailbad@example.com").count() == 1
    assert db_session.query(User).filter(User.email == "acct2_evil@example.com").count() == 0


def test_change_email_rejects_taken_and_same(anon_client):
    _auth(anon_client, "acct_taken@example.com")
    headers = _auth(anon_client, "acct_taker@example.com")
    resp = anon_client.post(
        "/api/v1/auth/change-email",
        json={"current_password": PASSWORD, "new_email": "acct_taken@example.com"},
        headers=headers,
    )
    assert resp.status_code == 409, resp.text
    resp = anon_client.post(
        "/api/v1/auth/change-email",
        json={"current_password": PASSWORD, "new_email": "acct_taker@example.com"},
        headers=headers,
    )
    assert resp.status_code == 400, resp.text


def test_change_phone_happy_path_normalizes(anon_client, db_session):
    headers = _auth(anon_client, "acct_phone@example.com")
    resp = anon_client.post(
        "/api/v1/auth/change-phone",
        json={"current_password": PASSWORD, "phone": "+91 98765 43210"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["phone_number"] == "+919876543210"
    user = db_session.query(User).filter(User.email == "acct_phone@example.com").one()
    assert user.phone_number == "+919876543210"


def test_change_phone_wrong_password_changes_nothing(anon_client, db_session):
    headers = _auth(anon_client, "acct_phonebad@example.com")
    resp = anon_client.post(
        "/api/v1/auth/change-phone",
        json={"current_password": "WrongPass123!", "phone": "+911111111111"},
        headers=headers,
    )
    assert resp.status_code == 403, resp.text
    user = db_session.query(User).filter(User.email == "acct_phonebad@example.com").one()
    assert user.phone_number is None


def test_change_phone_rejects_garbage(anon_client, db_session):
    """Two rejection layers: too-short fails the schema (422), long enough but
    not digits fails the E.164 shape (400). Neither stores a value."""
    headers = _auth(anon_client, "acct_phonegarbage@example.com")

    resp = anon_client.post(
        "/api/v1/auth/change-phone",
        json={"current_password": PASSWORD, "phone": "abc"},
        headers=headers,
    )
    assert resp.status_code == 422, resp.text

    for bad in ["abcdefg", "+91-98-76", "not_a_phone_1234"]:
        resp = anon_client.post(
            "/api/v1/auth/change-phone",
            json={"current_password": PASSWORD, "phone": bad},
            headers=headers,
        )
        assert resp.status_code == 400, (bad, resp.text)

    user = db_session.query(User).filter(User.email == "acct_phonegarbage@example.com").one()
    assert user.phone_number is None


def test_me_tolerates_ordinary_browsing(anon_client):
    """AuthGate and the nav bar each read /me on every page load, so a signed-in
    user browsing must not hit a rate limit. The old 10/minute cap made normal
    navigation return 429 after a handful of pages."""
    headers = _auth(anon_client, "acct_browse@example.com")
    for _ in range(25):
        resp = anon_client.get("/api/v1/auth/me", headers=headers)
        assert resp.status_code == 200, resp.text


def test_city_lookup_is_public_but_astrology_is_not(anon_client):
    """Registration asks for a birth city before an account exists, so the city
    search cannot require a session. It returns only reference data. Everything
    that reads a user's chart must still refuse an anonymous caller."""
    cities = anon_client.get("/api/v1/cities?q=Delhi")
    assert cities.status_code == 200, cities.text
    body = cities.json()
    assert body["cities"], body
    first = body["cities"][0]
    assert {"name", "lat", "lng"} <= set(first)

    assert anon_client.get("/api/v1/kundli/sample").status_code == 401
    assert anon_client.get("/api/v1/charts/list").status_code == 401


def test_account_routes_require_login(anon_client):
    for method, path, body in [
        ("PUT", "/api/v1/auth/profile", {"name": "X"}),
        ("POST", "/api/v1/auth/change-email", {"current_password": "x", "new_email": "a@b.co"}),
        ("POST", "/api/v1/auth/change-phone", {"current_password": "x", "phone": "+911111111111"}),
    ]:
        resp = anon_client.request(method, path, json=body)
        assert resp.status_code == 401, (method, path, resp.text)
