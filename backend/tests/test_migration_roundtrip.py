"""The migration history has to be reversible, not just applicable.

`alembic downgrade base` was never exercised anywhere: the suite runs against a
database built by `create_all`, and local development only ever moves forward.
So `0002_astrologer_marketplace` shipped a `downgrade()` that dropped the
`users.role` column while leaving `ix_users_role` in place. On SQLite that
aborts the batch table rebuild with "no such column: role" and leaves
`_alembic_tmp_users` behind, i.e. a half-migrated schema that is harder to
recover from than a clean failure.

This shells out to the real alembic CLI against a throwaway SQLite file. It is
slower than an in-process test, but it exercises the same code path a deploy or
a rollback actually takes, including `migrations/env.py`'s handling of
`DATABASE_URL`.
"""

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _alembic(*args: str, db_path: Path) -> subprocess.CompletedProcess:
    """Run the alembic CLI against an isolated database."""
    env = dict(os.environ)
    # Point alembic at a throwaway file so the developer's astroseva.db is
    # never touched. env.py reads DATABASE_URL from the app's engine.
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


def _tables(db_path: Path) -> set[str]:
    with sqlite3.connect(db_path) as conn:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return {row[0] for row in rows}


def _users_columns(db_path: Path) -> list[str]:
    with sqlite3.connect(db_path) as conn:
        return [row[1] for row in conn.execute("PRAGMA table_info(users)")]


@pytest.fixture
def probe_db(tmp_path) -> Path:
    return tmp_path / "migrations.db"


def test_history_rolls_all_the_way_back_and_forward_again(probe_db):
    up = _alembic("upgrade", "head", db_path=probe_db)
    assert up.returncode == 0, f"upgrade head failed:\n{up.stderr}"

    tables = _tables(probe_db)
    assert {"users", "user_settings", "astrologers", "job_runs"} <= tables

    down = _alembic("downgrade", "base", db_path=probe_db)
    assert down.returncode == 0, f"downgrade base failed:\n{down.stderr}"

    # Everything the migrations made is gone. alembic keeps its own bookkeeping
    # table, which is expected.
    assert _tables(probe_db) == {"alembic_version"}

    # A failed batch rebuild leaves a temporary table behind; that is the exact
    # corruption this guards against.
    assert not [t for t in _tables(probe_db) if t.startswith("_alembic_tmp_")]

    # And the whole history re-applies from a clean slate, so `downgrade` did not
    # consume anything the upgrade needs.
    again = _alembic("upgrade", "head", db_path=probe_db)
    assert again.returncode == 0, f"re-upgrade failed:\n{again.stderr}"
    assert "role" in _users_columns(probe_db)
    assert "user_settings" in _tables(probe_db)


def test_rolling_back_one_step_drops_the_column_it_added(probe_db):
    """The specific defect: 0002 must drop both the column and its index."""
    up = _alembic("upgrade", "head", db_path=probe_db)
    assert up.returncode == 0, f"upgrade head failed:\n{up.stderr}"
    assert "role" in _users_columns(probe_db)

    step = _alembic("downgrade", "0001_baseline", db_path=probe_db)
    assert step.returncode == 0, f"downgrade to baseline failed:\n{step.stderr}"

    tables = _tables(probe_db)
    assert not [t for t in tables if t.startswith("_alembic_tmp_")], (
        f"batch rebuild left a temporary table behind: {tables}"
    )
    assert "role" not in _users_columns(probe_db)
    assert "user_settings" not in tables

    with sqlite3.connect(probe_db) as conn:
        indexes = {row[0] for row in conn.execute("PRAGMA index_list(users)")}
    assert "ix_users_role" not in indexes, (
        "the index on the dropped column outlived the column"
    )