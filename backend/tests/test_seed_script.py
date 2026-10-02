"""The dev seed script must work, or onboarding is broken for newcomers.

`scripts/seed_dev.py` was verified by hand when written, but hand verification
does not run in CI. This drives the real script as a subprocess against a
throwaway database and asserts what it promises: four accounts, one draft
application, refusal without the guard variable, and idempotent reruns.
"""

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPT = BACKEND_DIR / "scripts" / "seed_dev.py"


def _run(db_path: Path, extra_env: dict | None = None) -> subprocess.CompletedProcess:
    env = dict(os.environ)
    env["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    env["JWT_SECRET"] = "seed-test-secret"
    if extra_env:
        env.update(extra_env)
    return subprocess.run(
        [sys.executable, str(SCRIPT)],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=300,
    )


def _emails(db_path: Path) -> set[str]:
    with sqlite3.connect(db_path) as conn:
        return {
            row[0] for row in conn.execute("SELECT email FROM users")
        }


def test_seed_creates_the_four_accounts_and_a_draft(tmp_path):
    db_path = tmp_path / "seed.db"

    first = _run(db_path, {"DEV_SEED": "1"})
    assert first.returncode == 0, f"seed failed:\n{first.stderr}"

    emails = _emails(db_path)
    assert emails == {
        "dev-client@example.com",
        "dev-astrologer@example.com",
        "dev-reviewer@example.com",
        "dev-admin@example.com",
    }

    with sqlite3.connect(db_path) as conn:
        rows = conn.execute(
            "SELECT status FROM astrologers"
        ).fetchall()
    assert [r[0] for r in rows] == ["applied"]


def test_seed_refuses_without_the_guard(tmp_path):
    db_path = tmp_path / "seed.db"

    proc = _run(db_path)
    assert proc.returncode != 0
    assert "DEV_SEED" in (proc.stdout + proc.stderr)
    assert not db_path.exists(), "refusal must happen before touching the database"


def test_seed_is_idempotent(tmp_path):
    db_path = tmp_path / "seed.db"

    assert _run(db_path, {"DEV_SEED": "1"}).returncode == 0
    second = _run(db_path, {"DEV_SEED": "1"})
    assert second.returncode == 0, f"rerun failed:\n{second.stderr}"

    with sqlite3.connect(db_path) as conn:
        assert conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 4
        assert conn.execute("SELECT COUNT(*) FROM astrologers").fetchone()[0] == 1
