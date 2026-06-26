from typing import Optional, List
from pydantic import BaseModel, Field

class SELinuxStatus(BaseModel):
    enabled: bool
    current_mode: str  # Enforcing, Permissive, Disabled
    config_mode: str   # Enforcing, Permissive, Disabled
    policy_type: str   # targeted, minimum, etc.

class SELinuxUpdateRequest(BaseModel):
    mode: str = Field(..., pattern="^(enforcing|permissive)$", description="Target SELinux run mode")

class SELinuxBoolean(BaseModel):
    name: str
    current_value: bool
    default_value: bool
    description: Optional[str] = None

class SELinuxBooleanToggleRequest(BaseModel):
    name: str
    value: bool

class SELinuxDenial(BaseModel):
    timestamp: str
    scontext: str
    tcontext: str
    tclass: str
    permission: str
    comm: str
    path: Optional[str] = None
    resolution: Optional[str] = None
