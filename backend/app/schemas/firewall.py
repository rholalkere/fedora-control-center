from typing import List, Optional
from pydantic import BaseModel, Field

class FirewallZoneInfo(BaseModel):
    name: str
    active: bool
    services: List[str]
    ports: List[str]
    interfaces: List[str]
    sources: List[str]

class FirewallPortRule(BaseModel):
    port: str  # e.g., 80 or 8000-8010
    protocol: str = Field("tcp", pattern="^(tcp|udp)$")

class FirewallServiceRule(BaseModel):
    service: str  # e.g., ssh, http

class FirewallActionResponse(BaseModel):
    success: bool
    message: str
