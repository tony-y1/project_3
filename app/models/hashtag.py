# 담당: A팀원
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Hashtag(Base):
    __tablename__ = "hashtags"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DiaryHashtag(Base):
    __tablename__ = "diary_hashtags"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    diary_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("diaries.id", ondelete="CASCADE"), nullable=False)
    hashtag_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hashtags.id"), nullable=False)
