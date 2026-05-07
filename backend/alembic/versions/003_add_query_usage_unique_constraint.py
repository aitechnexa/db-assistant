"""Add unique constraint on query_usage(user_id, query_date) for upsert support

Revision ID: 003
Revises: 605fdc149282
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '605fdc149282'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_query_usage_user_date',
        'query_usage',
        ['user_id', 'query_date'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_query_usage_user_date', 'query_usage', type_='unique')
