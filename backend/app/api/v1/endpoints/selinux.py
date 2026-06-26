from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core import deps
from app.schemas.selinux import SELinuxStatus, SELinuxUpdateRequest, SELinuxBoolean, SELinuxBooleanToggleRequest, SELinuxDenial
from app.services.selinux import SELinuxService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/status", response_model=SELinuxStatus, dependencies=[Depends(deps.get_current_user)])
def get_selinux_status():
    return SELinuxService.get_status()

@router.post("/mode")
def update_selinux_mode(
    request: Request,
    body: SELinuxUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="selinux_set_mode",
        ip_address=client_ip,
        details=f"Requested SELinux mode: {body.mode}"
    )

    success = SELinuxService.set_mode(body.mode)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to change SELinux mode to {body.mode}")

    return {"status": "success", "message": f"SELinux mode changed to {body.mode} successfully"}

@router.get("/booleans", response_model=List[SELinuxBoolean], dependencies=[Depends(deps.get_current_user)])
def get_selinux_booleans():
    return SELinuxService.get_booleans()

@router.post("/booleans/toggle")
def toggle_selinux_boolean(
    request: Request,
    body: SELinuxBooleanToggleRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="selinux_toggle_boolean",
        ip_address=client_ip,
        details=f"Toggled SELinux boolean: {body.name} to {body.value}"
    )

    success = SELinuxService.toggle_boolean(body.name, body.value)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to toggle SELinux boolean {body.name}")

    return {"status": "success", "message": f"SELinux boolean {body.name} set to {body.value} successfully"}

@router.get("/denials", response_model=List[SELinuxDenial], dependencies=[Depends(deps.get_current_user)])
def get_selinux_denials():
    return SELinuxService.get_denials()
