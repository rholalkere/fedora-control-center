from typing import List, Optional
from pydantic import BaseModel

class ContainerInfo(BaseModel):
    id: str
    name: str
    image: str
    state: str  # running, exited, paused, etc.
    status: str  # e.g., Up 10 minutes
    ports: str
    engine: str  # podman, docker

class ContainerActionRequest(BaseModel):
    id: str
    engine: str  # podman, docker
    action: str  # start, stop, restart

class ContainerLogsResponse(BaseModel):
    id: str
    engine: str
    logs: str
