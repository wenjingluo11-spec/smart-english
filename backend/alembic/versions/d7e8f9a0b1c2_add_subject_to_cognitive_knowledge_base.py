"""add subject to cognitive_knowledge_base

Revision ID: d7e8f9a0b1c2
Revises: c5f1a2b3d4e6
Create Date: 2026-02-28 04:06:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, None] = 'c5f1a2b3d4e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cognitive_knowledge_base',
        sa.Column('subject', sa.String(30), nullable=False, server_default='english'))
    op.create_index('ix_cognitive_knowledge_base_subject', 'cognitive_knowledge_base', ['subject'])


def downgrade() -> None:
    op.drop_index('ix_cognitive_knowledge_base_subject', table_name='cognitive_knowledge_base')
    op.drop_column('cognitive_knowledge_base', 'subject')
