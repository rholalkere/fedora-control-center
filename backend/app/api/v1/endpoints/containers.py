from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core import deps
from app.schemas.container import ContainerInfo, ContainerActionRequest, ContainerLogsResponse
from app.services.container import ContainerService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ContainerInfo], dependencies=[Depends(deps.get_current_user)])
def list_containers():
    return ContainerService.list_containers()

@router.post("/control")
def control_container(
    request: Request,
    command: ContainerActionRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action=f"container_{command.action}",
        ip_address=client_ip,
        details=f"Requested {command.action} for container {command.id} ({command.engine})"
    )

    success = ContainerService.control_container(command.id, command.engine, command.action)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to execute {command.action} on container {command.id}")

    return {"status": "success", "message": f"Container {command.id} {command.action}ed successfully"}

@router.get("/logs/{engine}/{container_id}", response_model=ContainerLogsResponse, dependencies=[Depends(deps.get_current_user)])
def get_container_logs(
    engine: str,
    container_id: str,
    tail: int = Query(100, ge=1, le=1000)
):
    if engine not in ["podman", "docker"]:
        raise HTTPException(status_code=400, detail="Invalid container engine")
    return ContainerService.get_container_logs(container_id, engine, tail)
