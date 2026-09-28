"""Database configuration."""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./astroseva.db")

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    })

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    _ensure_user_token_version()


def _ensure_user_token_version():
    """Lightweight migration: add users.token_version on pre-existing DBs."""
    try:
        with engine.connect() as conn:
            cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if "token_version" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"))
                conn.commit()
    except Exception:
        # Non-SQLite backends or fresh DBs: create_all already handles schema.
        pass
