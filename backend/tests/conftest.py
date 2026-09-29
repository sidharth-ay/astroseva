"""Shared pytest fixtures.

Feature routers are gated with Depends(get_current_user), so any test that
calls an endpoint through TestClient must either supply a valid token or
override the dependency. Overriding get_current_user keeps endpoint tests
focused on the endpoint's own behaviour instead of token plumbing.
"""

import pytest
from fastapi.testclient import TestClient

from app.db.models import User
from app.main import app
from app.services.auth_service import get_current_user


@pytest.fixture
def fake_user():
    return User(
        id=1,
        email="tester@example.com",
        name="Test User",
        token_version=0,
    )


@pytest.fixture
def anon_client():
    """TestClient with NO auth override -- requests hit the real 401 path."""
    return TestClient(app)


@pytest.fixture
def client(fake_user):
    """TestClient authenticated as `fake_user` via dependency override."""
    app.dependency_overrides[get_current_user] = lambda: fake_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def admin_user():
    return User(
        id=99,
        email="admin@example.com",
        name="Admin User",
        token_version=0,
    )


@pytest.fixture
def admin_client(admin_user):
    """TestClient authenticated as a user listed in ADMIN_EMAILS."""
    app.dependency_overrides[get_current_user] = lambda: admin_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
