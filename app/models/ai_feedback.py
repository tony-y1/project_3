# 담당: A팀원
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class AiFeedback(Base):
    __tablename__ = "ai_feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    diary_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("diaries.id"), unique=True, nullable=False)  # 일기당 1개
    persona_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("personas.id"), nullable=True)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)
    audio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    feedback_type: Mapped[str] = mapped_column(String(20), nullable=False)       # empathy | summary | advice
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
