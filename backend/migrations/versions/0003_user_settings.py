"""user_settings: per-user calculation settings

Revision ID: 0003_user_settings
Revises: 0002_astrologer_marketplace
Create Date: 2026-10-01

Adds the table that holds calculation preferences. There is one row per user,
created when the user first saves a setting rather than at registration, so no
backfill is needed for existing accounts; a missing row means the defaults.
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_user_settings"
down_revision = "0002_astrologer_marketplace"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("house_system", sa.String(length=32), nullable=False, server_default="whole-sign"),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade():
    op.drop_table("user_settings")
