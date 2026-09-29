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
    """Create any tables missing from the models.

    This is a convenience for a fresh local database only. ``create_all`` never
    ALTERs an existing table, so it silently does nothing for a column change on
    a populated database -- which is why schema *changes* must go through
    alembic (``alembic upgrade head``) rather than by editing models.py alone.

    The hand-rolled ``_ensure_user_token_version`` pragma patch that used to live
    here has been removed for the same reason: it was SQLite-only and swallowed
    its own failures, so a broken schema change looked like success. The
    token_version column is now part of the alembic baseline.
    """
    # Refuse to run against a populated database. This function is called at
    # import time, and `uvicorn --reload` therefore creates tables *before* an
    # alembic migration can run, which leaves the two out of step. A fresh
    # database is the only safe case for create_all.
    from sqlalchemy import inspect

    if inspect(engine).has_table("users"):
        return
    Base.metadata.create_all(bind=engine)
