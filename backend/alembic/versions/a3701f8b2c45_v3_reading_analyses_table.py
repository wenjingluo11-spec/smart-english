"""v3_reading_analyses_table

Revision ID: a3701f8b2c45
Revises: d2506e927182
Create Date: 2026-02-27 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3701f8b2c45'
down_revision: Union[str, None] = 'd2506e927182'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('reading_analyses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('material_id', sa.Integer(), nullable=False),
    sa.Column('paragraphs_json', sa.Text(), nullable=True),
    sa.Column('complex_sentences_json', sa.Text(), nullable=True),
    sa.Column('question_mapping_json', sa.Text(), nullable=True),
    sa.Column('summary', sa.Text(), nullable=True),
    sa.Column('structure_type', sa.String(50), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reading_analyses_material_id'), 'reading_analyses', ['material_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_reading_analyses_material_id'), table_name='reading_analyses')
    op.drop_table('reading_analyses')
