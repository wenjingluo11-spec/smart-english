"""add_cognitive_tables

Revision ID: 9d2c7af0b4f1
Revises: 4df78ac76311
Create Date: 2026-03-04 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9d2c7af0b4f1"
down_revision: Union[str, None] = "4df78ac76311"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cognitive_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("module", sa.String(length=30), nullable=False),
        sa.Column("guidance_mode", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("context_json", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cognitive_sessions_module"), "cognitive_sessions", ["module"], unique=False)
    op.create_index(op.f("ix_cognitive_sessions_user_id"), "cognitive_sessions", ["user_id"], unique=False)

    op.create_table(
        "cognitive_turns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("turn_index", sa.Integer(), nullable=False),
        sa.Column("stage", sa.String(length=20), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("mirror_level", sa.String(length=10), nullable=True),
        sa.Column("zpd_band", sa.String(length=20), nullable=True),
        sa.Column("hint_used", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("meta_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["cognitive_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cognitive_turns_session_id"), "cognitive_turns", ["session_id"], unique=False)
    op.create_index(op.f("ix_cognitive_turns_turn_index"), "cognitive_turns", ["turn_index"], unique=False)

    op.create_table(
        "reflection_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("turn_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("reflection_text", sa.Text(), nullable=False),
        sa.Column("quality_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["cognitive_sessions.id"]),
        sa.ForeignKeyConstraint(["turn_id"], ["cognitive_turns.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reflection_entries_session_id"), "reflection_entries", ["session_id"], unique=False)
    op.create_index(op.f("ix_reflection_entries_user_id"), "reflection_entries", ["user_id"], unique=False)

    op.create_table(
        "teaching_quality_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=True),
        sa.Column("tqi_score", sa.Float(), nullable=False),
        sa.Column("coherence_score", sa.Float(), nullable=True),
        sa.Column("evidence_score", sa.Float(), nullable=True),
        sa.Column("clarity_score", sa.Float(), nullable=True),
        sa.Column("mirror_level", sa.String(length=10), nullable=True),
        sa.Column("details_json", sa.JSON(), nullable=True),
        sa.Column("measured_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["cognitive_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_teaching_quality_metrics_measured_at"), "teaching_quality_metrics", ["measured_at"], unique=False)
    op.create_index(op.f("ix_teaching_quality_metrics_session_id"), "teaching_quality_metrics", ["session_id"], unique=False)
    op.create_index(op.f("ix_teaching_quality_metrics_user_id"), "teaching_quality_metrics", ["user_id"], unique=False)

    op.create_table(
        "cognitive_gain_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("period_type", sa.String(length=20), nullable=False),
        sa.Column("period_key", sa.String(length=30), nullable=True),
        sa.Column("baseline_score", sa.Float(), nullable=True),
        sa.Column("current_score", sa.Float(), nullable=True),
        sa.Column("cognitive_gain", sa.Float(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cognitive_gain_snapshots_created_at"), "cognitive_gain_snapshots", ["created_at"], unique=False)
    op.create_index(op.f("ix_cognitive_gain_snapshots_user_id"), "cognitive_gain_snapshots", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_cognitive_gain_snapshots_user_id"), table_name="cognitive_gain_snapshots")
    op.drop_index(op.f("ix_cognitive_gain_snapshots_created_at"), table_name="cognitive_gain_snapshots")
    op.drop_table("cognitive_gain_snapshots")

    op.drop_index(op.f("ix_teaching_quality_metrics_user_id"), table_name="teaching_quality_metrics")
    op.drop_index(op.f("ix_teaching_quality_metrics_session_id"), table_name="teaching_quality_metrics")
    op.drop_index(op.f("ix_teaching_quality_metrics_measured_at"), table_name="teaching_quality_metrics")
    op.drop_table("teaching_quality_metrics")

    op.drop_index(op.f("ix_reflection_entries_user_id"), table_name="reflection_entries")
    op.drop_index(op.f("ix_reflection_entries_session_id"), table_name="reflection_entries")
    op.drop_table("reflection_entries")

    op.drop_index(op.f("ix_cognitive_turns_turn_index"), table_name="cognitive_turns")
    op.drop_index(op.f("ix_cognitive_turns_session_id"), table_name="cognitive_turns")
    op.drop_table("cognitive_turns")

    op.drop_index(op.f("ix_cognitive_sessions_user_id"), table_name="cognitive_sessions")
    op.drop_index(op.f("ix_cognitive_sessions_module"), table_name="cognitive_sessions")
    op.drop_table("cognitive_sessions")
