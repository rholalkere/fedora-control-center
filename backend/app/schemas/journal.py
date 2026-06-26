from typing import List, Optional
from pydantic import BaseModel, Field

class LogLine(BaseModel):
    timestamp: str
    hostname: str
    process: str
    pid: Optional[str] = None
    message: str
    priority: int  # 0 (emerg) to 7 (debug)

class JournalFilter(BaseModel):
    service: Optional[str] = None
    priority: Optional[int] = Field(None, ge=0, le=7)
    since: Optional[str] = Field(None, description="e.g. -1h, -1d, or YYYY-MM-DD HH:MM:SS")
    search: Optional[str] = None
    limit: int = Field(100, ge=1, le=1000)

class LogResponse(BaseModel):
    lines: List[LogLine]
    count: int
