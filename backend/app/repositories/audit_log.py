from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

class AuditLogRepository:
    @staticmethod
    def create(db: Session, username: Optional[str], action: str, ip_address: Optional[str], details: Optional[str] = None) -> AuditLog:
        db_log = AuditLog(
            username=username,
            action=action,
            ip_address=ip_address,
            details=details
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log

    @staticmethod
    def get_logs(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        username: Optional[str] = None,
        action: Optional[str] = None
    ) -> List[AuditLog]:
        query = db.query(AuditLog)
        if username:
            query = query.filter(AuditLog.username == username)
        if action:
            query = query.filter(AuditLog.action.like(f"%{action}%"))
        return query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_logs(
        db: Session,
        username: Optional[str] = None,
        action: Optional[str] = None
    ) -> int:
        query = db.query(AuditLog)
        if username:
            query = query.filter(AuditLog.username == username)
        if action:
            query = query.filter(AuditLog.action.like(f"%{action}%"))
        return query.count()
