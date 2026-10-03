"""user_birth_profile: phone and birth fields on users

Revision ID: 0005_user_birth_profile
Revises: 0004_auth_completeness
Create Date: 2026-10-03

The account holds the user's birth profile: phone number plus the birth
details every astrology calculation needs. All columns are nullable so
existing rows upgrade without backfill; the application treats "every birth
field present" as a complete profile and anything less as incomplete.
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_user_birth_profile"
down_revision = "0004_auth_completeness"
branch_labels = None
depends_on = None


# (column name, type, comment). Kept as data so upgrade and downgrade cannot
# drift apart when a column is added here later.
PROFILE_COLUMNS = [
    ("phone_number", sa.String(length=64)),
    ("gender", sa.String(length=32)),
    ("birth_date", sa.String(length=20)),
    ("birth_time", sa.String(length=10)),
    ("birth_place", sa.String(length=255)),
    ("latitude", sa.Float()),
    ("longitude", sa.Float()),
    ("timezone_offset", sa.Float()),
    ("timezone_iana", sa.String(length=64)),
]


def upgrade():
    # batch_alter_table rebuilds the table on SQLite; adding only nullable
    # columns with no server default keeps every existing row valid.
    with op.batch_alter_table("users") as batch:
        for name, type_ in PROFILE_COLUMNS:
            batch.add_column(sa.Column(name, type_, nullable=True))


def downgrade():
    with op.batch_alter_table("users") as batch:
        for name, _ in reversed(PROFILE_COLUMNS):
            batch.drop_column(name)
