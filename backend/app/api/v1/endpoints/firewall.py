from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core import deps
from app.schemas.firewall import FirewallZoneInfo, FirewallPortRule, FirewallServiceRule, FirewallActionResponse
from app.services.firewall import FirewallService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/zones", response_model=List[FirewallZoneInfo], dependencies=[Depends(deps.get_current_user)])
def get_firewall_zones():
    return FirewallService.get_zones()

@router.post("/ports", response_model=FirewallActionResponse)
def manage_firewall_port(
    request: Request,
    rule: FirewallPortRule,
    zone: str = Query("public"),
    action: str = Query(..., pattern="^(add|remove)$"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action=f"firewall_{action}_port",
        ip_address=client_ip,
        details=f"Requested {action} port {rule.port}/{rule.protocol} in zone {zone}"
    )

    response = FirewallService.manage_port(zone, rule.port, rule.protocol, action)
    if not response.success:
        raise HTTPException(status_code=500, detail=response.message)
        
    return response

@router.post("/services", response_model=FirewallActionResponse)
def manage_firewall_service(
    request: Request,
    rule: FirewallServiceRule,
    zone: str = Query("public"),
    action: str = Query(..., pattern="^(add|remove)$"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action=f"firewall_{action}_service",
        ip_address=client_ip,
        details=f"Requested {action} service {rule.service} in zone {zone}"
    )

    response = FirewallService.manage_service(zone, rule.service, action)
    if not response.success:
        raise HTTPException(status_code=500, detail=response.message)
        
    return response
