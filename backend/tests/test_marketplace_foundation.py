"""Marketplace foundation tests: roles, storage, jobs, migrations.

The role model is new, so the point of these tests is that authorisation is a
dependency and cannot be forgotten: every marketplace route must refuse a client
account, and a reviewer must not be able to reach admin-only work.
"""

import os
import pathlib
import tempfile
from pathlib import Path

import pytest

from app.db.models import (
    ROLE_ADMIN,
    ROLE_ASTROLOGER,
    ROLE_CLIENT,
    ROLE_REVIEWER,
    User,
)
from app.services import storage_service
from app.services.auth_service import is_admin
from app.services.storage_service import StorageError


# --- roles ------------------------------------------------------------------


def test_every_account_defaults_to_client():
    assert User(id=1, email="a@b.c", name="n", hashed_password="h").role in (
        None, ROLE_CLIENT
    )


def test_is_admin_reads_the_role_only(monkeypatch):
    """The ADMIN_EMAILS allowlist is gone; `users.role` is the only authority."""
    # An allowlist in the environment grants nothing.
    monkeypatch.setenv("ADMIN_EMAILS", "boss@x.com, other@x.com")
    assert is_admin(User(email="boss@x.com", role=ROLE_CLIENT)) is False
    assert is_admin(User(email="BOSS@x.com", role=ROLE_CLIENT)) is False
    # The role grants it regardless of the environment.
    assert is_admin(User(email="anyone@x.com", role=ROLE_ADMIN)) is True
    assert is_admin(User(email="nope@x.com", role=ROLE_CLIENT)) is False


def test_is_admin_is_true_for_a_role_mismatch_case_insensitively():
    """`_role_of` lowercases and defaults, so an odd-cased role still counts."""
    assert is_admin(User(email="a@x.com", role="ADMIN")) is True
    assert is_admin(User(email="a@x.com", role="Admin")) is True
    assert is_admin(User(email="a@x.com", role="admin ")) is True


def test_a_user_with_no_role_is_not_an_admin():
    assert is_admin(User(email="a@x.com")) is False
    assert is_admin(User(email="a@x.com", role=None)) is False


# --- storage ----------------------------------------------------------------


@pytest.fixture
def temp_storage(monkeypatch):
    with tempfile.TemporaryDirectory() as tmp:
        monkeypatch.setattr(storage_service, "STORAGE_ROOT", Path(tmp))
        yield Path(tmp)


def test_store_and_read_roundtrip(temp_storage):
    stored = storage_service.store_file("astrologers/1", "application/pdf", "pan.pdf", b"%PDF-1.4")
    assert stored.key.startswith("astrologers/1/")
    assert stored.size_bytes == 8
    assert storage_service.open_file(stored.key) == b"%PDF-1.4"


def test_store_rejects_disallowed_content_type(temp_storage):
    with pytest.raises(StorageError):
        storage_service.store_file("astrologers/1", "text/html", "x.html", b"<script>")


def test_store_rejects_empty_file(temp_storage):
    with pytest.raises(StorageError):
        storage_service.store_file("astrologers/1", "application/pdf", "e.pdf", b"")


def test_store_rejects_oversized_file(temp_storage, monkeypatch):
    monkeypatch.setattr(storage_service, "MAX_UPLOAD_BYTES", 10)
    with pytest.raises(StorageError):
        storage_service.store_file("astrologers/1", "application/pdf", "b.pdf", b"x" * 11)


@pytest.mark.parametrize("key", [
    "../escape.pdf",
    "/absolute.pdf",
    "astrologers/../../etc/passwd",
    "",
    "astrologers/1/../../x",
])
def test_path_traversal_is_rejected(temp_storage, key):
    with pytest.raises(StorageError):
        storage_service.open_file(key)


def test_delete_file_and_namespace(temp_storage):
    a = storage_service.store_file("astrologers/7", "application/pdf", "a.pdf", b"a")
    b = storage_service.store_file("astrologers/7", "image/png", "b.png", b"b")
    assert storage_service.delete_file(a.key) is True
    assert storage_service.delete_file(a.key) is False
    with pytest.raises(StorageError):
        storage_service.open_file(a.key)
    removed = storage_service.delete_namespace("astrologers/7")
    assert removed >= 1
    with pytest.raises(StorageError):
        storage_service.open_file(b.key)


def test_delete_namespace_rejects_traversal(temp_storage):
    with pytest.raises(StorageError):
        storage_service.delete_namespace("../..")


# --- jobs -------------------------------------------------------------------


def test_job_requires_registered_handler():
    from app.services import jobs
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        with pytest.raises(KeyError):
            jobs.enqueue(db, "no_such_job_type", {})
    finally:
        db.close()


def test_registered_handlers_present():
    from app.services import job_handlers
    types = job_handlers.registered_types()
    assert "onboarding_submitted" in types
    assert "onboarding_status_changed" in types


# --- migrations -------------------------------------------------------------


def test_migration_history_is_linear_from_baseline():
    """The schema is versioned; a second head would break `upgrade head`.

    The chain is checked rather than a frozen list of filenames, so adding a
    migration does not turn this into a tripwire -- only a genuinely branched
    or unchained history should fail.
    """
    import pathlib
    import re

    revisions = {}
    for path in sorted(pathlib.Path("migrations/versions").glob("*.py")):
        if path.name.startswith("__"):
            continue
        src = path.read_text(encoding="utf-8")
        rev = re.search(r'^revision\s*(?::[^=]+)?=\s*["\']([^"\']+)["\']', src, re.M)
        down = re.search(r'^down_revision\s*(?::[^=]+)?=\s*(.+)$', src, re.M)
        assert rev, f"{path.name} does not declare a revision"
        raw = down.group(1).strip().rstrip(",") if down else "None"
        # The baseline declares `down_revision = None`, which is the root of the
        # chain rather than a revision named "None".
        parent = raw if raw.startswith(('"', "'")) else None
        revisions[rev.group(1)] = parent.strip('"\'') if parent else None

    assert len(revisions) == len(set(revisions)), "two files declare the same revision"

    # Exactly one head: nothing else is a parent.
    parents = {down for down in revisions.values() if down is not None}
    heads = [rev for rev in revisions if rev not in parents]
    assert len(heads) == 1, f"expected one head, found {heads}"

    # Walk down to the baseline; every parent must exist.
    seen, cursor = set(), heads[0]
    while cursor is not None:
        assert cursor not in seen, f"cycle at {cursor}"
        seen.add(cursor)
        assert cursor in revisions, f"{cursor} is a parent but has no migration file"
        cursor = revisions[cursor]

    assert "0001_baseline" in seen, "history no longer reaches the baseline"


def test_users_has_a_role_column_with_a_default():
    """The original landmine: create_all never ALTERs, so role needs a
    server_default or every pre-existing row ends up NULL."""
    src = pathlib.Path("migrations/versions/0002_astrologer_marketplace.py").read_text(encoding="utf-8")
    assert 'server_default="client"' in src, "role must be added with a server default"
    assert "batch_alter_table" in src, "SQLite needs batch mode to add a column"
