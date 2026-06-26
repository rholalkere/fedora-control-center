from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Text
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=True)  # Store username directly to keep records if user is deleted
    action = Column(String, nullable=False, index=True)
    ip_address = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
