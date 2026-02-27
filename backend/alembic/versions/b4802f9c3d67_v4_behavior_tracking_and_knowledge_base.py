"""v4_behavior_tracking_and_knowledge_base

Revision ID: b4802f9c3d67
Revises: a3701f8b2c45
Create Date: 2026-02-27 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4802f9c3d67'
down_revision: Union[str, None] = 'a3701f8b2c45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # behavior_events
    op.create_table('behavior_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('session_id', sa.String(64), nullable=False),
    sa.Column('module', sa.String(30), nullable=False),
    sa.Column('question_id', sa.Integer(), nullable=True),
    sa.Column('material_id', sa.Integer(), nullable=True),
    sa.Column('event_type', sa.String(50), nullable=False),
    sa.Column('event_data', sa.JSON(), nullable=True),
    sa.Column('timestamp_ms', sa.Integer(), nullable=False),
    sa.Column('duration_ms', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_behavior_events_user_id'), 'behavior_events', ['user_id'], unique=False)
    op.create_index(op.f('ix_behavior_events_session_id'), 'behavior_events', ['session_id'], unique=False)
    op.create_index(op.f('ix_behavior_events_module'), 'behavior_events', ['module'], unique=False)
    op.create_index(op.f('ix_behavior_events_question_id'), 'behavior_events', ['question_id'], unique=False)
    op.create_index(op.f('ix_behavior_events_event_type'), 'behavior_events', ['event_type'], unique=False)

    # user_behavior_profiles
    op.create_table('user_behavior_profiles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('avg_question_time_ms', sa.Integer(), server_default='0', nullable=False),
    sa.Column('reads_key_phrases', sa.Float(), server_default='0', nullable=False),
    sa.Column('reads_distractors', sa.Float(), server_default='0', nullable=False),
    sa.Column('uses_tts', sa.Float(), server_default='0', nullable=False),
    sa.Column('uses_expert_demo', sa.Float(), server_default='0', nullable=False),
    sa.Column('uses_hints', sa.Float(), server_default='0', nullable=False),
    sa.Column('preferred_enhancement', sa.String(30), server_default='balanced', nullable=False),
    sa.Column('enhancement_effectiveness', sa.Float(), server_default='0', nullable=False),
    sa.Column('weak_patterns_json', sa.Text(), nullable=True),
    sa.Column('total_events', sa.Integer(), server_default='0', nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_behavior_profiles_user_id'), 'user_behavior_profiles', ['user_id'], unique=True)

    # cognitive_knowledge_base
    op.create_table('cognitive_knowledge_base',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('question_type', sa.String(50), nullable=False),
    sa.Column('topic', sa.String(100), server_default='', nullable=False),
    sa.Column('difficulty', sa.Integer(), server_default='3', nullable=False),
    sa.Column('best_strategy_json', sa.Text(), nullable=True),
    sa.Column('common_errors_json', sa.Text(), nullable=True),
    sa.Column('effective_clues_json', sa.Text(), nullable=True),
    sa.Column('human_annotation_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('ai_analysis_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('user_behavior_count', sa.Integer(), server_default='0', nullable=False),
    sa.Column('avg_success_rate', sa.Float(), server_default='0', nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cognitive_knowledge_base_question_type'), 'cognitive_knowledge_base', ['question_type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_cognitive_knowledge_base_question_type'), table_name='cognitive_knowledge_base')
    op.drop_table('cognitive_knowledge_base')
    op.drop_index(op.f('ix_user_behavior_profiles_user_id'), table_name='user_behavior_profiles')
    op.drop_table('user_behavior_profiles')
    op.drop_index(op.f('ix_behavior_events_event_type'), table_name='behavior_events')
    op.drop_index(op.f('ix_behavior_events_question_id'), table_name='behavior_events')
    op.drop_index(op.f('ix_behavior_events_module'), table_name='behavior_events')
    op.drop_index(op.f('ix_behavior_events_session_id'), table_name='behavior_events')
    op.drop_index(op.f('ix_behavior_events_user_id'), table_name='behavior_events')
    op.drop_table('behavior_events')
