"""add cognitive_feedback_records table

Revision ID: c5f1a2b3d4e6
Revises: 84da144db47a
Create Date: 2026-02-28 04:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5f1a2b3d4e6'
down_revision: Union[str, None] = '84da144db47a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cognitive_feedback_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('question_id', sa.Integer(), nullable=False, index=True),
        sa.Column('gaze_path_id', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('helpful_steps', sa.Text(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('cognitive_feedback_records')
