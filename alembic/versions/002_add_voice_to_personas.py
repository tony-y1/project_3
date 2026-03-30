"""add voice column to personas

Revision ID: 002
Revises: 001
Create Date: 2026-03-30

"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # personas 테이블에 voice 컬럼 추가
    # alloy | nova | echo | fable | onyx | shimmer 중 하나
    op.add_column(
        "personas",
        sa.Column("voice", sa.String(20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("personas", "voice")
