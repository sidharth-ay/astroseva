"""Alembic environment for AstroSeva.

The schema was originally created by ``Base.metadata.create_all`` with no
migration history, so an existing database has tables but no ``alembic_version``
row. The baseline revision in versions/ recreates exactly what ``create_all``
produced, and existing databases are ``stamped`` at that baseline rather than
having the baseline applied to them -- otherwise stamping would try to CREATE
tables that already exist.

``init_db`` still calls ``create_all`` for a fresh database so local setup keeps
working with no migration step, but from this point on schema *changes* are made
only through revisions here. ``create_all`` never alters an existing table, so
relying on it silently does nothing on a populated database.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.db.database import Base, engine
import app.db.models  # noqa: F401  - import for side-effect: registers tables

config = context.config
# The app already builds its engine from DATABASE_URL; reuse it so migrations
# and the application can never disagree about which database they are on.
config.set_main_option("sqlalchemy.url", str(engine.url).replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=str(engine.url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # SQLite cannot ALTER a column in place; batch mode rebuilds the table.
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
