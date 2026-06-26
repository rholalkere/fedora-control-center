from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AuditLogOut(BaseModel):
    id: int
    username: Optional[str]
    action: str
    ip_address: Optional[str]
    details: Optional[str]
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
