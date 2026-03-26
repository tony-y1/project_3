from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    user_id = Column(String, primary_key=True)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
