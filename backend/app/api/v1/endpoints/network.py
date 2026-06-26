from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core import deps
from app.schemas.network import (
    NetworkInterface, 
    ConnectedDevice, 
    ActiveSocket, 
    RouteEntry, 
    WifiNetwork,
    BlockDeviceRequest,
    UnblockDeviceRequest,
    BlockedDeviceResponse,
    NetworkUsageAnalytics,
    AccessLogResponse
)
from app.services.network import NetworkService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

# --- Active State Queries ---

@router.get("/interfaces", response_model=List[NetworkInterface], dependencies=[Depends(deps.get_current_user)])
def get_network_interfaces():
    return NetworkService.get_interfaces()

@router.get("/devices", response_model=List[ConnectedDevice], dependencies=[Depends(deps.get_current_user)])
def get_connected_devices():
    return NetworkService.get_devices()

@router.get("/sockets", response_model=List[ActiveSocket], dependencies=[Depends(deps.get_current_user)])
def get_active_sockets():
    return NetworkService.get_sockets()

@router.get("/routes", response_model=List[RouteEntry], dependencies=[Depends(deps.get_current_user)])
def get_network_routes():
    return NetworkService.get_routes()

@router.get("/wifi", response_model=List[WifiNetwork], dependencies=[Depends(deps.get_current_user)])
def get_wifi_networks():
    return NetworkService.get_wifi()

# --- Network Access Controls ---

@router.post("/devices/block", dependencies=[Depends(deps.get_admin_user)])
def block_device(
    request: Request,
    body: BlockDeviceRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit logging
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="network_block_device",
        ip_address=client_ip,
        details=f"Blocked MAC: {body.mac}, IP: {body.ip}, Hostname: {body.hostname}, Reason: {body.reason}"
    )
    
    success = NetworkService.block_device(
        db=db,
        mac=body.mac,
        ip=body.ip,
        hostname=body.hostname,
        reason=body.reason
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to block device in firewall.")
        
    return {"status": "success", "message": f"Device {body.mac} blocked successfully."}

@router.post("/devices/unblock", dependencies=[Depends(deps.get_admin_user)])
def unblock_device(
    request: Request,
    body: UnblockDeviceRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit logging
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="network_unblock_device",
        ip_address=client_ip,
        details=f"Unblocked MAC: {body.mac}"
    )
    
    success = NetworkService.unblock_device(db=db, mac=body.mac)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to unblock device or device was not blocked.")
        
    return {"status": "success", "message": f"Device {body.mac} unblocked successfully."}

@router.get("/devices/blocked", response_model=List[BlockedDeviceResponse], dependencies=[Depends(deps.get_current_user)])
def get_blocked_devices(db: Session = Depends(deps.get_db)):
    return NetworkService.get_blocked_devices(db)

# --- Historical Usage & Access Analytics ---

@router.get("/analytics/usage", response_model=NetworkUsageAnalytics, dependencies=[Depends(deps.get_current_user)])
def get_usage_analytics(range_days: int = 7, db: Session = Depends(deps.get_db)):
    return NetworkService.get_usage_analytics(db, range_days)

@router.get("/analytics/access-logs", response_model=List[AccessLogResponse], dependencies=[Depends(deps.get_current_user)])
def get_access_logs(
    skip: int = 0,
    limit: int = 50,
    source_ip: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(deps.get_db)
):
    return NetworkService.get_access_logs(db, skip, limit, source_ip, search)
