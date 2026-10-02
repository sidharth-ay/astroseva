"""Shared pytest fixtures.

Feature routers are gated with Depends(get_current_user), so any test that
calls an endpoint through TestClient must either supply a valid token or
override the dependency. Overriding get_current_user keeps endpoint tests
focused on the endpoint's own behaviour instead of token plumbing.
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import tempfile

from app.db.models import (
    ROLE_ADMIN,
    ROLE_ASTROLOGER,
    ROLE_CLIENT,
    ROLE_REVIEWER,
    User,
)
from app.main import app
from app.services.auth_service import get_current_user


# --- isolated test database -------------------------------------------------
#
# Every test that goes through TestClient resolves get_db, which by default
# points at the real astroseva.db. Endpoint tests create and commit rows, so
# without this they would write into the development database. One throwaway
# SQLite file is created per session and injected in place of get_db.

@pytest.fixture(scope="session")
def test_sessionmaker():
    from app.db.database import Base
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    tmp = tempfile.TemporaryDirectory()
    engine = create_engine(
        f"sqlite:///{Path(tmp.name) / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield factory
    engine.dispose()
    tmp.cleanup()


@pytest.fixture
def isolated_db(test_sessionmaker):
    """Function-scoped session on the test database, rolled back afterwards."""
    session = test_sessionmaker()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


def _make_client(user, factory):
    """Build a TestClient whose requests hit the test database.

    `factory` is the resolved sessionmaker: the override closure must capture the
    value, not the fixture function (pytest fixtures cannot be called directly).
    """
    from app.db.database import get_db

    def _override_get_db():
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    if user is not None:
        app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def _clear_overrides():
    from app.db.database import get_db
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def fake_user():
    return User(
        id=1,
        email="tester@example.com",
        name="Test User",
        role=ROLE_CLIENT,
        token_version=0,
    )


@pytest.fixture
def anon_client(test_sessionmaker):
    """TestClient with NO auth override -- requests hit the real 401 path."""
    c = _make_client(None, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()


@pytest.fixture
def client(fake_user, test_sessionmaker):
    """TestClient authenticated as `fake_user` via dependency override."""
    c = _make_client(fake_user, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()


@pytest.fixture
def admin_user():
    return User(
        id=99,
        email="admin@example.com",
        name="Admin User",
        role=ROLE_ADMIN,
        token_version=0,
    )


@pytest.fixture
def admin_client(admin_user, test_sessionmaker):
    c = _make_client(admin_user, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()


@pytest.fixture
def reviewer_user():
    return User(
        id=50,
        email="reviewer@example.com",
        name="Reviewer User",
        role=ROLE_REVIEWER,
        token_version=0,
    )


@pytest.fixture
def reviewer_client(reviewer_user, test_sessionmaker):
    c = _make_client(reviewer_user, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()


@pytest.fixture
def applicant_user():
    return User(
        id=10,
        email="applicant@example.com",
        name="Kavya Sharma",
        role=ROLE_ASTROLOGER,
        token_version=0,
    )


@pytest.fixture
def applicant_client(applicant_user, test_sessionmaker):
    """TestClient authenticated as a signed-in astrologer applicant."""
    c = _make_client(applicant_user, test_sessionmaker)
    try:
        yield c
    finally:
        _clear_overrides()


def build_test_request():
    """A minimal starlette Request, for tests that call an endpoint *function*
    directly instead of going through TestClient.

    `@limiter.limit` reads the request off the handler's signature rather than
    the ASGI scope, so a decorated endpoint called directly has to be handed a
    real `Request`. Without one such a test fails with "parameter `request` must
    be an instance of starlette.requests.Request", which is a confusing way to
    learn that the endpoint became rate limited.
    """
    from starlette.requests import Request

    from app.main import app

    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "root_path": "",
            "scheme": "http",
            "headers": [],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
            "app": app,
        }
    )


@pytest.fixture
def http_request():
    return build_test_request()


@pytest.fixture
def db_session(isolated_db):
    """A real database session for service-level tests.

    Isolated: these tests commit, so sharing the application's engine would
    write test rows into astroseva.db and leak state between tests.
    """
    yield isolated_db


# Alias the onboarding tests use, which read more naturally as `db`.
@pytest.fixture
def db(isolated_db):
    yield isolated_db
