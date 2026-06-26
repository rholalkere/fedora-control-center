from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core import deps
from app.schemas.service import ServiceInfo, ServiceControl, ServiceStatusResponse
from app.services.systemd import SystemdService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ServiceInfo], dependencies=[Depends(deps.get_current_user)])
def list_system_services(search: Optional[str] = None):
    return SystemdService.list_services(search=search)

@router.post("/control", response_model=ServiceStatusResponse)
def control_system_service(
    request: Request,
    command: ServiceControl,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log the attempt
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action=f"service_{command.action}",
        ip_address=client_ip,
        details=f"Requested {command.action} for service: {command.name}"
    )

    response = SystemdService.control_service(command.name, command.action)
    
    if "Failed" in response.raw_output:
        raise HTTPException(status_code=500, detail=response.raw_output)

    return response
