from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core import deps
from app.schemas.package import PackageInfo, UpdateHistoryEntry, PackageActionRequest, PackageActionResponse
from app.services.dnf import DnfService
from app.repositories.audit_log import AuditLogRepository
from app.models.user import User

router = APIRouter()

@router.get("/installed", response_model=List[PackageInfo], dependencies=[Depends(deps.get_current_user)])
def get_installed_packages():
    return DnfService.list_installed_packages()

@router.get("/updates", response_model=List[PackageInfo], dependencies=[Depends(deps.get_current_user)])
def check_for_updates():
    return DnfService.check_updates()

@router.get("/search", response_model=List[PackageInfo], dependencies=[Depends(deps.get_current_user)])
def search_packages(q: str = Query(..., min_length=2)):
    return DnfService.search_packages(q)

@router.post("/install", response_model=PackageActionResponse)
def install_packages(
    request: Request,
    body: PackageActionRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_admin_user)
):
    client_ip = request.client.host if request.client else "unknown"
    
    # Audit log the attempt
    AuditLogRepository.create(
        db=db,
        username=current_user.username,
        action="install_packages",
        ip_address=client_ip,
        details=f"Requested DNF install for packages: {', '.join(body.packages)}"
    )

    response = DnfService.install_packages(body.packages)
    if not response.success:
        raise HTTPException(status_code=500, detail=response.message)
        
    return response

@router.get("/history", response_model=List[UpdateHistoryEntry], dependencies=[Depends(deps.get_current_user)])
def get_dnf_update_history():
    return DnfService.get_update_history()
