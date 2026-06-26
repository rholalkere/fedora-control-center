from typing import List, Optional
from pydantic import BaseModel, Field

class ServiceInfo(BaseModel):
    name: str
    description: str
    load_state: str
    active_state: str
    sub_state: str
    enabled_state: str  # enabled, disabled, static, masked, unknown

class ServiceControl(BaseModel):
    name: str = Field(..., description="The systemd service unit name (e.g. sshd.service)")
    action: str = Field(..., pattern="^(start|stop|restart)$", description="The action to perform")

class ServiceStatusResponse(BaseModel):
    name: str
    active: bool
    status_text: str
    raw_output: str
