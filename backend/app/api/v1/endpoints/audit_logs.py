from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core import deps
from app.schemas.audit_log import AuditLogOut
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[AuditLogOut])
def get_system_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    username: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    """
    Get audit logs. Restricted to administrator role.
    """
    return AuditLogRepository.get_logs(
        db=db,
        skip=skip,
        limit=limit,
        username=username,
        action=action
    )
