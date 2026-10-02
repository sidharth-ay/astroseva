"""Seed a fresh database with the accounts needed to exercise the app.

A fresh clone has no users at all, so the marketplace, the reviewer queue, and
anything behind login cannot be tried without hand-crafting rows. This creates
one of each role with a known password, plus a draft astrologer application
sitting in the reviewer queue.

Usage:
    python scripts/seed_dev.py            # SQLite dev database
    DATABASE_URL=postgresql://... python scripts/seed_dev.py

All passwords are `DevPass123!`. This must never run against production: it
refuses unless DEV_SEED=1 is set, so a misconfigured DATABASE_URL fails
closed rather than planting known credentials in a live database.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

if os.getenv("DEV_SEED") != "1":
    raise SystemExit(
        "Refusing to seed: set DEV_SEED=1 to confirm this is a development database."
    )

from app.db.database import SessionLocal, init_db  # noqa: E402
from app.db.models import Astrologer, User  # noqa: E402
from app.services.auth_service import hash_password  # noqa: E402

PASSWORD = "DevPass123!"

ACCOUNTS = [
    ("dev-client@example.com", "Dev Client", "client"),
    ("dev-astrologer@example.com", "Dev Astrologer", "astrologer"),
    ("dev-reviewer@example.com", "Dev Reviewer", "reviewer"),
    ("dev-admin@example.com", "Dev Admin", "admin"),
]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        for email, name, role in ACCOUNTS:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"  exists: {email} ({existing.role})")
                continue
            db.add(
                User(
                    email=email,
                    name=name,
                    hashed_password=hash_password(PASSWORD),
                    role=role,
                    email_verified=True,
                )
            )
            print(f"  created: {email} ({role})")
        db.commit()

        astrologer = db.query(User).filter(User.email == "dev-astrologer@example.com").one()
        draft = (
            db.query(Astrologer).filter(Astrologer.user_id == astrologer.id).first()
        )
        if draft is None:
            db.add(
                Astrologer(
                    user_id=astrologer.id,
                    slug="dev-astrologer",
                    headline="Demo practitioner awaiting review",
                    bio="Seeded draft application for exercising the reviewer queue.",
                    experience_years=5,
                    status="applied",
                )
            )
            db.commit()
            print("  created: draft astrologer application (status=applied)")
        else:
            print(f"  exists: astrologer application (status={draft.status})")
    finally:
        db.close()

    print(f"\nAll passwords are {PASSWORD!r}. Do not use these anywhere real.")


if __name__ == "__main__":
    main()
