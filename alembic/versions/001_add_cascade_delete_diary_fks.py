"""add cascade delete to diary foreign keys

Revision ID: 001
Revises:
Create Date: 2026-03-30

"""
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # diary_hashtags.diary_id FK → ON DELETE CASCADE
    op.drop_constraint("diary_hashtags_diary_id_fkey", "diary_hashtags", type_="foreignkey")
    op.create_foreign_key(
        "diary_hashtags_diary_id_fkey",
        "diary_hashtags", "diaries",
        ["diary_id"], ["id"],
        ondelete="CASCADE",
    )

    # ai_feedbacks.diary_id FK → ON DELETE CASCADE
    op.drop_constraint("ai_feedbacks_diary_id_fkey", "ai_feedbacks", type_="foreignkey")
    op.create_foreign_key(
        "ai_feedbacks_diary_id_fkey",
        "ai_feedbacks", "diaries",
        ["diary_id"], ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # CASCADE 제거 (원래대로 복구)
    op.drop_constraint("diary_hashtags_diary_id_fkey", "diary_hashtags", type_="foreignkey")
    op.create_foreign_key(
        "diary_hashtags_diary_id_fkey",
        "diary_hashtags", "diaries",
        ["diary_id"], ["id"],
    )

    op.drop_constraint("ai_feedbacks_diary_id_fkey", "ai_feedbacks", type_="foreignkey")
    op.create_foreign_key(
        "ai_feedbacks_diary_id_fkey",
        "ai_feedbacks", "diaries",
        ["diary_id"], ["id"],
    )
