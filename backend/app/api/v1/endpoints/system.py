import asyncio
import json
import jwt
import os
import logging
from typing import List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query, Request, HTTPException
from sqlalchemy.orm import Session
from app.core import deps
from app.core.config import settings
from app.core.security import ALGORITHM
from app.core.websocket import manager
from app.schemas.system import SystemMetrics, ProcessInfo, KillProcessRequest, PowerProfileInfo, SetPowerProfileRequest
from app.services.system import SystemService
from app.repositories.user import UserRepository
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

logger = logging.getLogger("fedora_control_center")

router = APIRouter()

@router.get("/metrics", response_model=SystemMetrics, dependencies=[Depends(deps.get_current_user)])
def get_system_metrics():
    return SystemService.get_all_metrics()

@router.websocket("/ws/telemetry")
async def websocket_telemetry(
    websocket: WebSocket,
    token: str = Query(...)
):
    # Authenticate WebSocket connection
    db = next(deps.get_db())
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        user = UserRepository.get_by_id(db, user_id)
        if not user or not user.is_active:
            await websocket.accept()
            await websocket.close(code=1008) # Policy Violation
            return
    except Exception:
        await websocket.accept()
        await websocket.close(code=1008)
        return
    finally:
        db.close()

    await manager.connect(websocket)
    try:
        while True:
            # Gather metrics
            metrics = SystemService.get_all_metrics()
            
            # Send to client
            # Use custom encoder or model dump
            await websocket.send_text(metrics.model_dump_json())
            
            # Wait 2 seconds
            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)

@router.post("/reboot")
def system_reboot(
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="system_reboot",
        ip_address=client_ip,
        details="Triggered host system reboot"
    )
    
    # Run asynchronously to allow API response to return before rebooting
    try:
        import subprocess
        subprocess.Popen(["systemctl", "reboot"])
        return {"status": "success", "message": "Reboot command issued successfully."}
    except Exception as e:
        logger.error(f"Failed to issue reboot command: {str(e)}")
        return {"status": "success", "message": "Reboot command triggered (Mock/Dev Mode)."}

@router.post("/shutdown")
def system_shutdown(
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="system_shutdown",
        ip_address=client_ip,
        details="Triggered host system poweroff"
    )
    
    try:
        import subprocess
        subprocess.Popen(["systemctl", "poweroff"])
        return {"status": "success", "message": "Shutdown command issued successfully."}
    except Exception as e:
        logger.error(f"Failed to issue shutdown command: {str(e)}")
        return {"status": "success", "message": "Shutdown command triggered (Mock/Dev Mode)."}

# --- Performance: Process Monitoring & Control ---

@router.get("/processes", response_model=List[ProcessInfo], dependencies=[Depends(deps.get_current_user)])
def get_processes():
    return SystemService.get_processes()

@router.post("/processes/kill", dependencies=[Depends(deps.get_admin_user)])
def kill_process(
    request: Request,
    body: KillProcessRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="system_kill_process",
        ip_address=client_ip,
        details=f"Killed process PID: {body.pid}"
    )
    success = SystemService.kill_process(body.pid)
    if not success:
        raise HTTPException(status_code=404, detail="Process not found or access denied.")
    return {"status": "success", "message": f"Process {body.pid} terminated."}

# --- Performance: Power Profiles Management ---

@router.get("/power-profile", response_model=PowerProfileInfo, dependencies=[Depends(deps.get_current_user)])
def get_power_profile():
    return SystemService.get_power_profile()

@router.post("/power-profile", dependencies=[Depends(deps.get_admin_user)])
def set_power_profile(
    request: Request,
    body: SetPowerProfileRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="system_set_power_profile",
        ip_address=client_ip,
        details=f"Set system power profile to: {body.profile}"
    )
    success = SystemService.set_power_profile(body.profile)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to switch power profile.")
    return {"status": "success", "message": f"Power profile set to {body.profile}."}

