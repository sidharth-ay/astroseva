"""Auth enforcement tests.

Feature routers are mounted with Depends(get_current_user). These tests pin
that boundary: anonymous callers get 401, the public surface (register, login,
root, health) stays open, and the admin cache-wipe is actually admin-only with
no "*" escape hatch.
"""

import pytest


# GET endpoints that take no body, one per router family.
PROTECTED_GETS = [
    "/api/v1/predictions/types",
    "/api/v1/horoscope/signs",
    "/api/v1/panchang/daily",
    "/api/v1/mantra/categories",
    "/api/v1/healing/crystals",
]


@pytest.mark.parametrize("path", PROTECTED_GETS)
def test_protected_endpoint_rejects_anonymous(anon_client, path):
    """No token -> 401. This is the real gate; AuthGate is only cosmetic."""
    resp = anon_client.get(path)
    assert resp.status_code == 401, f"{path} returned {resp.status_code}: {resp.text}"


@pytest.mark.parametrize("path", PROTECTED_GETS)
def test_protected_endpoint_allows_authenticated(client, path):
    """The same endpoints work once a valid session exists."""
    resp = client.get(path)
    assert resp.status_code == 200, f"{path} returned {resp.status_code}: {resp.text}"


KUNDLI_PAYLOAD = {
    "name": "Auth Check",
    "birth_date": "1990-06-15",
    "birth_time": "10:30",
    "birth_place": "New Delhi, India",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezone_offset": 5.5,
}


# NOTE: anonymous and authenticated assertions live in separate tests on
# purpose. Both fixtures inject a dependency override, and pytest instantiates
# every fixture before the body runs -- putting anon_client and client in one
# test leaks the auth override into the "anonymous" call.


def test_kundli_generate_rejects_anonymous(anon_client):
    """The kundli endpoint the user called out specifically."""
    resp = anon_client.post("/api/v1/kundli/generate", json=KUNDLI_PAYLOAD)
    assert resp.status_code == 401, f"anonymous got {resp.status_code}"


def test_kundli_generate_allows_authenticated(client):
    resp = client.post("/api/v1/kundli/generate", json=KUNDLI_PAYLOAD)
    assert resp.status_code == 200, f"authenticated got {resp.status_code}: {resp.text}"


def test_dosha_detect_rejects_anonymous(anon_client):
    resp = anon_client.post("/api/v1/doshas/detect", json=KUNDLI_PAYLOAD)
    assert resp.status_code == 401, f"anonymous got {resp.status_code}"


def test_dosha_detect_allows_authenticated(client):
    resp = client.post("/api/v1/doshas/detect", json=KUNDLI_PAYLOAD)
    assert resp.status_code == 200, f"authenticated got {resp.status_code}: {resp.text}"


# --- public surface stays reachable ---------------------------------------


def test_register_and_login_are_public(anon_client):
    """Users must be able to create an account and log in without a token."""
    email = "newuser_auth_test@example.com"
    reg = anon_client.post(
        "/api/v1/auth/register",
        json={"email": email, "name": "New User", "password": "StrongPass123"},
    )
    assert reg.status_code in (200, 201), reg.text
    # Anti-enumeration: register must not hand back a token / auto-login.
    assert "token" not in reg.json()

    login = anon_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass123"},
    )
    assert login.status_code == 200, login.text
    assert login.json().get("token")


def test_root_and_health_are_public(anon_client):
    assert anon_client.get("/").status_code == 200
    assert anon_client.get("/health").status_code in (200, 503)


# --- admin cache-wipe ------------------------------------------------------


def test_clear_cache_rejects_non_admin(client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com")
    # client is authenticated as tester@example.com, which is not an admin.
    resp = client.post("/api/v1/admin/clear-cache?pattern=doshas:*")
    assert resp.status_code == 403, resp.text


def test_clear_cache_rejects_anonymous(anon_client):
    resp = anon_client.post("/api/v1/admin/clear-cache?pattern=doshas:*")
    assert resp.status_code == 401


def test_clear_cache_rejects_star_pattern(admin_client, monkeypatch):
    """The old `pattern != "*"` check let the full wipe through."""
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com")
    resp = admin_client.post("/api/v1/admin/clear-cache?pattern=*")
    assert resp.status_code == 400, resp.text
    assert "not allowed" in resp.json().get("error", "").lower()


def test_clear_cache_requires_explicit_pattern(admin_client, monkeypatch):
    """Omitting the pattern can no longer default to a full wipe."""
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com")
    resp = admin_client.post("/api/v1/admin/clear-cache")
    assert resp.status_code == 422, resp.text


def test_clear_cache_allows_admin_with_valid_namespace(admin_client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com")
    resp = admin_client.post("/api/v1/admin/clear-cache?pattern=doshas:*")
    assert resp.status_code == 200, resp.text
    assert resp.json().get("pattern") == "doshas:*"


def test_no_admin_configured_means_nobody_is_admin(admin_client, monkeypatch):
    """Empty ADMIN_EMAILS -> the capability is closed by default."""
    monkeypatch.setenv("ADMIN_EMAILS", "")
    resp = admin_client.post("/api/v1/admin/clear-cache?pattern=doshas:*")
    assert resp.status_code == 403
