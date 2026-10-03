"""Birth profile on the account: register-with-birth, /me shape, migration.

The account holds the user's birth profile (phone + birth details), which
every calculation reads. Registration can carry the profile for first-run
users; /me reports it back. All columns are nullable so old rows stay valid.
"""
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from app.core.rate_limit import limiter
from app.db.models import User

BACKEND_DIR = Path(__file__).resolve().parents[1]

PROFILE_COLUMNS = [
    "phone_number",
    "gender",
    "birth_date",
    "birth_time",
    "birth_place",
    "latitude",
    "longitude",
    "timezone_offset",
    "timezone_iana",
]

FULL_BIRTH = {
    "gender": "female",
    "birth_date": "1996-09-05",
    "birth_time": "08:00",
    "birth_place": "Dehri, Bihar",
    "latitude": 25.2837,
    "longitude": 84.006,
    "timezone_offset": 5.5,
    "timezone_iana": "Asia/Kolkata",
}


@pytest.fixture(autouse=True)
def clean_db(db_session):
    db_session.query(User).filter(User.email.startswith("birth_")).delete()
    db_session.commit()
    limiter.reset()
    yield
    limiter.reset()


def _register(anon_client, email, **extra):
    body = {"email": email, "name": "Birth User", "password": "ValidPass123!", **extra}
    return anon_client.post("/api/v1/auth/register", json=body)


def _login(anon_client, email):
    resp = anon_client.post(
        "/api/v1/auth/login", json={"email": email, "password": "ValidPass123!"}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


def test_register_with_full_birth_profile_persists(anon_client, db_session):
    resp = _register(anon_client, "birth_full@example.com", **FULL_BIRTH)
    assert resp.status_code == 200, resp.text

    user = db_session.query(User).filter(User.email == "birth_full@example.com").one()
    assert user.gender == "female"
    assert user.birth_date == "1996-09-05"
    assert user.birth_time == "08:00"
    assert user.birth_place == "Dehri, Bihar"
    assert user.latitude == pytest.approx(25.2837)
    assert user.longitude == pytest.approx(84.006)
    assert user.timezone_offset == pytest.approx(5.5)
    assert user.timezone_iana == "Asia/Kolkata"
    assert user.phone_number is None


def test_register_without_birth_leaves_nulls(anon_client, db_session):
    resp = _register(anon_client, "birth_bare@example.com")
    assert resp.status_code == 200, resp.text

    user = db_session.query(User).filter(User.email == "birth_bare@example.com").one()
    for column in PROFILE_COLUMNS:
        assert getattr(user, column) is None, column


def test_me_reports_the_birth_profile(anon_client):
    _register(anon_client, "birth_me@example.com", **FULL_BIRTH)
    token = _login(anon_client, "birth_me@example.com")

    me = anon_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    body = me.json()
    assert body["birth_date"] == "1996-09-05"
    assert body["birth_time"] == "08:00"
    assert body["birth_place"] == "Dehri, Bihar"
    assert body["gender"] == "female"
    assert body["phone_number"] is None
    assert body["email"] == "birth_me@example.com"


def test_birth_geo_out_of_range_is_rejected(anon_client):
    resp = _register(anon_client, "birth_far@example.com", latitude=200.0)
    assert resp.status_code == 400, resp.text

    resp = _register(anon_client, "birth_far2@example.com", longitude=-200.0)
    assert resp.status_code == 400, resp.text

    resp = _register(anon_client, "birth_far3@example.com", timezone_offset=99.0)
    assert resp.status_code == 400, resp.text


def test_birth_shapes_are_validated(anon_client):
    # Not a date at all: pydantic rejects the shape.
    resp = _register(anon_client, "birth_bad1@example.com", birth_date="tomorrow")
    assert resp.status_code == 422, resp.text

    resp = _register(anon_client, "birth_bad2@example.com", birth_time="8am")
    assert resp.status_code == 422, resp.text

    resp = _register(anon_client, "birth_bad3@example.com", gender="x" * 33)
    assert resp.status_code == 422, resp.text


def _alembic(*args: str, db_path: Path) -> subprocess.CompletedProcess:
    env = dict(os.environ)
    env["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    env["JWT_SECRET"] = "test-secret-not-a-real-one"
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=300,
    )


def _users_columns(db_path: Path) -> list[str]:
    with sqlite3.connect(db_path) as conn:
        return [row[1] for row in conn.execute("PRAGMA table_info(users)")]


def test_0005_adds_and_removes_birth_columns(tmp_path):
    """The new columns apply cleanly and roll back without residue."""
    db_path = tmp_path / "birth_migration.db"

    up = _alembic("upgrade", "head", db_path=db_path)
    assert up.returncode == 0, f"upgrade head failed:\n{up.stderr}"
    columns = _users_columns(db_path)
    for column in PROFILE_COLUMNS:
        assert column in columns, column

    step = _alembic("downgrade", "0004_auth_completeness", db_path=db_path)
    assert step.returncode == 0, f"downgrade failed:\n{step.stderr}"
    columns = _users_columns(db_path)
    for column in PROFILE_COLUMNS:
        assert column not in columns, column
    with sqlite3.connect(db_path) as conn:
        tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    assert not [t for t in tables if t.startswith("_alembic_tmp_")]
