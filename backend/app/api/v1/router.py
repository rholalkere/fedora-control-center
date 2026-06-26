from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    system,
    services,
    logs,
    packages,
    containers,
    firewall,
    selinux,
    ai,
    audit_logs,
    network
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(system.router, prefix="/system", tags=["System"])
api_router.include_router(services.router, prefix="/services", tags=["Services"])
api_router.include_router(logs.router, prefix="/logs", tags=["Journal Logs"])
api_router.include_router(packages.router, prefix="/packages", tags=["Package Management"])
api_router.include_router(containers.router, prefix="/containers", tags=["Containers"])
api_router.include_router(firewall.router, prefix="/firewall", tags=["Firewall"])
api_router.include_router(selinux.router, prefix="/selinux", tags=["SELinux"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Module"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(network.router, prefix="/network", tags=["Network"])
