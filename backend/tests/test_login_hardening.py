"""Login must not leak which addresses exist, and must not accept prefixes.

Two properties of `/auth/login`, both about the bcrypt comparison:

  - an unknown address short-circuited before verification, so it answered in a
    database round trip while a known one took a full bcrypt verification. Same
    401, different time, which is enough to enumerate registered accounts.
  - bcrypt ignores everything past 72 bytes, so a 100-character password
    authenticated against any password sharing its first 72 characters.
"""

import time

import pytest

from app.db.models import User
from app.services.auth_service import (
    MAX_PASSWORD_BYTES,
    burn_password_verification,
    password_is_oversized,
)


# The login endpoint is rate limited to 10/minute, and this module deliberately
# makes repeated calls, so the limiter is switched off for it and restored
# afterwards. The limit itself is covered in test_auth_enforcement.
@pytest.fixture(autouse=True)
def _no_rate_limit():
    from app.core.rate_limit import limiter

    limiter.enabled = False
    try:
        yield
    finally:
        limiter.enabled = True


KNOWN_PASSWORD = "Known-Password-1"


@pytest.fixture
def registered(test_sessionmaker):
    """A real user with a known password, committed to the test database.

    Yields the id and email rather than the ORM object: the object belongs to
    the fixture's session, and handing it to another session -- as the
    authenticated client would -- raises "already attached to session".
    """
    import uuid

    from app.services.auth_service import hash_password

    email = f"login-{uuid.uuid4().hex}@example.com"
    session = test_sessionmaker()
    try:
        user = User(
            email=email, name="Login User", hashed_password="", token_version=0
        )
        session.add(user)
        session.flush()
        user.hashed_password = hash_password(KNOWN_PASSWORD)
        session.commit()
        yield {"id": user.id, "email": user.email}
    finally:
        session.query(User).filter(User.email == email).delete()
        session.commit()
        session.close()


def _login(client, email, password="whatever-Password-1"):
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )


# --- both cases answer identically --------------------------------------------

def test_unknown_and_wrong_password_both_return_401(client, registered):
    unknown = _login(client, "nobody@example.com")
    wrong = _login(client, registered["email"], "Wrong-Password-1")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]


def test_the_correct_password_succeeds(client, registered):
    r = _login(client, registered["email"], KNOWN_PASSWORD)
    assert r.status_code == 200, r.text
    assert r.json()["token"]


def test_an_unknown_address_costs_a_verification(client, registered):
    """The burn must actually do the work, not return immediately."""
    started = time.perf_counter()
    burn_password_verification("anything")
    burnt = time.perf_counter() - started

    started = time.perf_counter()
    _login(client, "nobody@example.com")
    early = time.perf_counter() - started

    assert burnt > 0.01, "burn_password_verification did no work"
    assert early > 0.005, (
        f"an unknown address answered in {early*1000:.1f}ms, which is not "
        f"consistent with spending a bcrypt verification"
    )


def test_the_two_cases_are_close_in_time(client, registered):
    """A crude wall-clock check, since the gap was the whole vulnerability.

    Timings are noisy in CI, so this asserts they are within a small multiple of
    each other rather than matching exactly. The short-circuit this replaces was
    two orders of magnitude faster.
    """
    def timed(email):
        best = 10.0
        for _ in range(3):
            start = time.perf_counter()
            _login(client, email)
            best = min(best, time.perf_counter() - start)
        return best

    unknown = timed("nobody@example.com")
    known = timed(registered["email"])
    assert unknown > known / 2, (
        f"unknown {unknown*1000:.0f}ms vs known {known*1000:.0f}ms -- "
        f"the enumeration oracle is back"
    )
    assert unknown < known * 5, (
        f"unknown {unknown*1000:.0f}ms is far slower than known "
        f"{known*1000:.0f}ms"
    )


# --- bcrypt's 72-byte truncation ----------------------------------------------

def test_the_byte_limit_is_72():
    assert MAX_PASSWORD_BYTES == 72


@pytest.mark.parametrize("password", [
    "x" * 72,                # exactly at the limit
    "x" * 73,                # one over
    "é" * 40,            # 80 bytes as UTF-8, only 40 characters
    "🔑" * 19,           # 76 bytes, 38 characters
])
def test_oversize_is_measured_in_bytes_not_characters(password):
    """`len()` counts characters; bcrypt counts bytes."""
    assert password_is_oversized(password) == (len(password.encode()) > 72)


def test_a_long_password_is_rejected_not_truncated(client, registered):
    r = _login(client, registered["email"], "A" * 72 + "extra-ignored-by-bcrypt")
    assert r.status_code == 400, r.text
    assert "72" in r.json()["detail"]


def test_the_stored_password_cannot_be_matched_by_its_prefix(client, registered):
    """The actual exploit: a 73-byte password's first 72 bytes must not work."""
    from app.services.auth_service import hash_password, verify_password

    password = "Known-Password-1" + "X" * (MAX_PASSWORD_BYTES + 10)
    stored = hash_password(password)
    # bcrypt would accept this prefix...
    assert verify_password(password[:MAX_PASSWORD_BYTES], stored) is True
    # ...so the endpoint must refuse to set such a password at all.
    r = _login(client, registered["email"], password)
    assert r.status_code == 400


@pytest.fixture
def own_client(registered, test_sessionmaker):
    """A client authenticated AS the registered user.

    The `client` fixture is signed in as a different user, so /change-password
    would be checking that user's password rather than this one. A detached
    instance is constructed rather than reusing the fixture's object, which
    belongs to another session.
    """
    from tests.conftest import _clear_overrides, _make_client

    # Loaded then detached, so it carries the stored hash (the endpoint verifies
    # the current password against it) without belonging to this session.
    session = test_sessionmaker()
    try:
        actor = session.query(User).filter(
            User.id == registered["id"]
        ).one()
        session.expunge(actor)
    finally:
        session.close()

    c = _make_client(actor, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()


def test_change_password_refuses_an_oversize_new_password(own_client):
    r = own_client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": KNOWN_PASSWORD,
            "new_password": "New-Password-1" + "X" * 100,
        },
    )
    assert r.status_code == 400, r.text


def test_change_password_accepts_one_at_the_limit(own_client):
    """72 bytes, meeting the complexity rule, must be allowed."""
    new_password = "N" * 69 + "aA1"
    assert len(new_password.encode()) == MAX_PASSWORD_BYTES
    assert password_is_oversized(new_password) is False
    r = own_client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": KNOWN_PASSWORD,
            "new_password": new_password,
        },
    )
    assert r.status_code == 200, r.text


def test_registration_refuses_an_oversize_password(client):
    """RegisterRequest caps at 128 characters, well above the bcrypt limit."""
    r = client.post(
        "/api/v1/auth/register",
        json={
            "email": "oversize@example.com",
            "name": "Too Long",
            "password": "Ab1" + "x" * 200,
        },
    )
    assert r.status_code == 400, r.text
