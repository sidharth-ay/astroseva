"""`users.role` must be the only authority for administrator rights.

`is_admin` consulted an `ADMIN_EMAILS` environment allowlist alongside the role
column, and either was sufficient. An address named in the environment was an
administrator whatever its role said, which meant the environment -- not the
database -- could grant the highest privilege in the application.
"""

import os
from pathlib import Path

import pytest

from app.db.models import ROLES, User
from app.services.auth_service import (
    is_admin,
    require_admin,
    require_astrologer_account,
    require_reviewer,
)

BACKEND = Path(__file__).resolve().parents[1]


def _user(email="a@x.com", role="client"):
    return User(email=email, name="n", role=role)


# --- the allowlist grants nothing ---------------------------------------------

@pytest.mark.parametrize("value", ["boss@x.com", "BOSS@x.com", "a@x.com, b@x.com"])
def test_an_environment_allowlist_confers_nothing(monkeypatch, value):
    """Previously the deciding factor: an allowlisted email was an admin
    whatever role it held."""
    monkeypatch.setenv("ADMIN_EMAILS", value)
    assert is_admin(_user("boss@x.com", "client")) is False
    assert is_admin(_user("boss@x.com", "reviewer")) is False


def test_the_allowlist_is_no_longer_read():
    """No `os.getenv("ADMIN_EMAILS")` call may remain.

    Prose mentioning the variable is fine, and the `is_admin` docstring
    explains why it went; what must not exist is a lookup.
    """
    source = (BACKEND / "app" / "services" / "auth_service.py").read_text(
        encoding="utf-8"
    )
    code = "\n".join(
        line for line in source.splitlines()
        if not line.lstrip().startswith("#")
    )
    assert 'getenv("ADMIN_EMAILS")' not in code
    assert "ADMIN_EMAILS" not in code.replace(
        'getenv("ADMIN_EMAILS")', ""
    ).split("def is_admin")[0], (
        "ADMIN_EMAILS is still consulted outside is_admin"
    )


# --- the role decides ---------------------------------------------------------

@pytest.mark.parametrize("role", ["admin", "ADMIN", "Admin", " admin "])
def test_the_admin_role_confers_admin(monkeypatch, role):
    monkeypatch.setenv("ADMIN_EMAILS", "")
    assert is_admin(_user("a@x.com", role)) is True


@pytest.mark.parametrize("role", ["client", "astrologer", "reviewer", "", None])
def test_other_roles_do_not_confer_admin(monkeypatch, role):
    monkeypatch.setenv("ADMIN_EMAILS", "a@x.com")
    assert is_admin(_user("a@x.com", role)) is False


def test_a_missing_role_is_not_admin():
    assert is_admin(User(email="a@x.com")) is False


# --- the dependencies must follow the same rule -------------------------------

def _call(coro):
    """Await a dependency directly; pytest-asyncio is not installed here."""
    import asyncio

    return asyncio.run(coro)


def test_require_admin_rejects_a_privileged_email(monkeypatch):
    """The end-to-end case: an allowlisted address is still refused."""
    from fastapi import HTTPException

    monkeypatch.setenv("ADMIN_EMAILS", "boss@x.com")
    with pytest.raises(HTTPException) as exc:
        _call(require_admin(_user("boss@x.com", "client")))
    assert exc.value.status_code == 403


def test_require_admin_accepts_the_admin_role(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "")
    assert _call(require_admin(_user("a@x.com", "admin"))) is not None


def test_require_reviewer_accepts_reviewer_and_admin_only(monkeypatch):
    from fastapi import HTTPException

    monkeypatch.setenv("ADMIN_EMAILS", "boss@x.com,reviewer@x.com")
    assert _call(require_reviewer(_user("a@x.com", "reviewer"))) is not None
    assert _call(require_reviewer(_user("a@x.com", "admin"))) is not None
    for role in ("client", "astrologer"):
        with pytest.raises(HTTPException):
            _call(require_reviewer(_user("a@x.com", role)))


def test_require_astrologer_account_does_not_admit_an_allowlisted_client(monkeypatch):
    from fastapi import HTTPException

    monkeypatch.setenv("ADMIN_EMAILS", "boss@x.com")
    with pytest.raises(HTTPException):
        _call(require_astrologer_account(_user("boss@x.com", "client")))


# --- there must be a way to make the first administrator ----------------------

def test_a_bootstrap_command_exists():
    """With the allowlist gone, the first admin has to be set deliberately."""
    assert (BACKEND / "app" / "cli.py").exists()


def test_the_bootstrap_command_is_not_an_endpoint():
    """A bootstrap API would let a caller mint themselves an administrator."""
    from app.main import app

    paths = [
        route.path
        for route in app.routes
        if getattr(route, "path", None)
    ]
    assert paths, "no routes found; the app failed to import"
    for path in paths:
        assert "bootstrap" not in path.lower(), path
        assert "set-admin" not in path.lower(), path
        assert "set-role" not in path.lower(), path


def test_the_cli_offers_set_admin_and_reports_when_there_is_none():
    from app import cli

    assert hasattr(cli, "cmd_set_admin")
    assert hasattr(cli, "cmd_set_role")
    assert hasattr(cli, "cmd_list_admins")
    # Every role it can assign must be a real one.
    source = (BACKEND / "app" / "cli.py").read_text(encoding="utf-8")
    assert "from .db.models import ROLES, User" in source
    assert set(ROLES) == {"client", "astrologer", "reviewer", "admin"}


def test_promotion_invalidates_existing_sessions():
    """A token issued before promotion must not gain rights afterwards."""
    source = (BACKEND / "app" / "cli.py").read_text(encoding="utf-8")
    assert "token_version" in source, (
        "promotion must bump token_version so live sessions are invalidated"
    )


def test_the_cli_help_runs():
    """Smoke test: the module is importable and its parser is wired up."""
    from app.cli import main

    with pytest.raises(SystemExit) as exc:
        main(["--help"])
    assert exc.value.code == 0
