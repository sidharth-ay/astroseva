"""astrologer marketplace: users.role and six new tables

Revision ID: 0002_astrologer_marketplace
Revises: 0001_baseline
Create Date: 2026-09-29

Adds the role column and the onboarding tables. role is added with a server
default so existing rows become 'client' rather than NULL.
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_astrologer_marketplace"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.add_column(
            sa.Column(
                "role",
                sa.String(length=32),
                nullable=False,
                server_default="client",
            )
        )
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "astrologers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("headline", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("experience_years", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("languages", sa.JSON(), nullable=False),
        sa.Column("specialties", sa.JSON(), nullable=False),
        sa.Column("avatar_key", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("probation_until", sa.Date(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("accuracy_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("assessment_pass_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("mock_consultation_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_assessments", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_computed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_astrologers_id"), "astrologers", ["id"], unique=False)
    op.create_index(op.f("ix_astrologers_slug"), "astrologers", ["slug"], unique=True)
    op.create_index(op.f("ix_astrologers_status"), "astrologers", ["status"], unique=False)
    op.create_index(op.f("ix_astrologers_user_id"), "astrologers", ["user_id"], unique=True)

    op.create_table(
        "astrologer_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("astrologer_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=60), nullable=False),
        sa.Column("storage_key", sa.String(length=255), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("content_type", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("identity_status", sa.String(length=32), nullable=False, server_default="self_declared"),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["astrologer_id"], ["astrologers.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_astrologer_documents_id"), "astrologer_documents", ["id"], unique=False)
    op.create_index(op.f("ix_astrologer_documents_astrologer_id"), "astrologer_documents", ["astrologer_id"], unique=False)
    op.create_index(op.f("ix_astrologer_documents_kind"), "astrologer_documents", ["kind"], unique=False)
    op.create_index(op.f("ix_astrologer_documents_identity_status"), "astrologer_documents", ["identity_status"], unique=False)

    op.create_table(
        "astrologer_assessments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("astrologer_id", sa.Integer(), nullable=False),
        sa.Column("attempt_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("questions_snapshot", sa.JSON(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("passed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("pass_mark", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("overridden_by", sa.Integer(), nullable=True),
        sa.Column("override_note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["astrologer_id"], ["astrologers.id"]),
        sa.ForeignKeyConstraint(["overridden_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_astrologer_assessments_id"), "astrologer_assessments", ["id"], unique=False)
    op.create_index(op.f("ix_astrologer_assessments_astrologer_id"), "astrologer_assessments", ["astrologer_id"], unique=False)

    op.create_table(
        "astrologer_mock_consults",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("astrologer_id", sa.Integer(), nullable=False),
        sa.Column("evaluator_id", sa.Integer(), nullable=False),
        sa.Column("scenario", sa.Text(), nullable=False, server_default=""),
        sa.Column("response", sa.Text(), nullable=False, server_default=""),
        sa.Column("score_accuracy", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_clarity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_empathy", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score_structure", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("verdict", sa.String(length=32), nullable=False, server_default="fail"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("evaluated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["astrologer_id"], ["astrologers.id"]),
        sa.ForeignKeyConstraint(["evaluator_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_astrologer_mock_consults_id"), "astrologer_mock_consults", ["id"], unique=False)
    op.create_index(op.f("ix_astrologer_mock_consults_astrologer_id"), "astrologer_mock_consults", ["astrologer_id"], unique=False)

    op.create_table(
        "astrologer_availability",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("astrologer_id", sa.Integer(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_minute", sa.Integer(), nullable=False),
        sa.Column("end_minute", sa.Integer(), nullable=False),
        sa.Column("timezone_offset", sa.Float(), nullable=False, server_default="5.5"),
        sa.Column("slot_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["astrologer_id"], ["astrologers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_astrologer_availability_id"), "astrologer_availability", ["id"], unique=False)
    op.create_index(op.f("ix_astrologer_availability_astrologer_id"), "astrologer_availability", ["astrologer_id"], unique=False)

    op.create_table(
        "onboarding_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("astrologer_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=60), nullable=False),
        sa.Column("from_status", sa.String(length=32), nullable=True),
        sa.Column("to_status", sa.String(length=32), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["astrologer_id"], ["astrologers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_onboarding_events_id"), "onboarding_events", ["id"], unique=False)
    op.create_index(op.f("ix_onboarding_events_astrologer_id"), "onboarding_events", ["astrologer_id"], unique=False)
    op.create_index(op.f("ix_onboarding_events_event_type"), "onboarding_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_onboarding_events_created_at"), "onboarding_events", ["created_at"], unique=False)

    op.create_table(
        "job_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_type", sa.String(length=80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("run_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_runs_id"), "job_runs", ["id"], unique=False)
    op.create_index(op.f("ix_job_runs_job_type"), "job_runs", ["job_type"], unique=False)
    op.create_index(op.f("ix_job_runs_status"), "job_runs", ["status"], unique=False)


def downgrade():
    op.drop_table("job_runs")
    op.drop_table("onboarding_events")
    op.drop_table("astrologer_availability")
    op.drop_table("astrologer_mock_consults")
    op.drop_table("astrologer_assessments")
    op.drop_table("astrologer_documents")
    op.drop_table("astrologers")
    # The index has to go first. SQLite has no DROP COLUMN, so alembic recreates
    # `users` as a new table and copies the rows across; it reflects the indexes
    # along with the columns, and an index that still names the dropped column
    # aborts the rebuild with "no such column: role", leaving `_alembic_tmp_users`
    # behind and the schema half-migrated.
    op.drop_index(op.f("ix_users_role"), table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("role")
