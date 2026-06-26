from typing import List, Optional
from pydantic import BaseModel

class PackageInfo(BaseModel):
    name: str
    version: str
    release: str
    architecture: str
    repository: str  # e.g. @System, fedora, updates
    summary: Optional[str] = None

class UpdateHistoryEntry(BaseModel):
    id: int
    command_line: str
    action: str  # install, update, erase, etc.
    date: str
    user: str

class PackageActionRequest(BaseModel):
    packages: List[str]

class PackageActionResponse(BaseModel):
    success: bool
    message: str
    output: Optional[str] = None
