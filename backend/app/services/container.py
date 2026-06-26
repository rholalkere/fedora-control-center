import json
import logging
from typing import List, Optional
from app.schemas.container import ContainerInfo, ContainerActionRequest, ContainerLogsResponse
from app.services.utils import run_system_command, is_command_available, force_mock_active

logger = logging.getLogger("fedora_control_center")

# Mock containers list
MOCK_CONTAINERS = [
    ContainerInfo(id="c1b2c3d4e5f6", name="web-app", image="fedora/nginx:latest", state="running", status="Up 4 hours", ports="8080:80", engine="podman"),
    ContainerInfo(id="a1b2c3d4e5f6", name="ollama-service", image="ollama/ollama:latest", state="running", status="Up 2 hours", ports="11434:11434", engine="podman"),
    ContainerInfo(id="f1e2d3c4b5a6", name="postgres-db", image="postgres:16-alpine", state="exited", status="Exited (0) 1 day ago", ports="5432:5432", engine="docker")
]

class ContainerService:
    @classmethod
    def list_containers(cls) -> List[ContainerInfo]:
        if force_mock_active():
            return MOCK_CONTAINERS
        containers = []

        # Check Podman
        if is_command_available("podman"):
            code, stdout, _ = run_system_command(["podman", "ps", "-a", "--format", "json"], timeout=5.0)
            if code == 0 and stdout:
                try:
                    data = json.loads(stdout)
                    # Podman outputs array of dicts
                    for item in data:
                        # Normalize fields
                        ports_list = item.get("Ports", [])
                        ports_str = ", ".join([f"{p.get('hostPort')}:{p.get('containerPort')}" for p in ports_list if p.get('hostPort')]) if isinstance(ports_list, list) else str(ports_list)
                        
                        containers.append(
                            ContainerInfo(
                                id=item.get("Id", item.get("ID", ""))[:12],
                                name=item.get("Names", [item.get("Name", "unknown")])[0] if isinstance(item.get("Names"), list) else item.get("Names", "unknown"),
                                image=item.get("Image", ""),
                                state=item.get("State", "unknown").lower(),
                                status=item.get("Status", ""),
                                ports=ports_str or "none",
                                engine="podman"
                            )
                        )
                except Exception as e:
                    logger.error(f"Error parsing podman JSON: {str(e)}")

        # Check Docker
        if is_command_available("docker"):
            # Docker returns json lines
            code, stdout, _ = run_system_command(["docker", "ps", "-a", "--format", "{{json .}}"], timeout=5.0)
            if code == 0 and stdout:
                for line in stdout.strip().split("\n"):
                    if not line:
                        continue
                    try:
                        item = json.loads(line)
                        containers.append(
                            ContainerInfo(
                                id=item.get("ID", "")[:12],
                                name=item.get("Names", ""),
                                image=item.get("Image", ""),
                                state=item.get("State", "unknown").lower(),
                                status=item.get("Status", ""),
                                ports=item.get("Ports", "") or "none",
                                engine="docker"
                            )
                        )
                    except Exception as e:
                        logger.error(f"Error parsing docker JSON: {str(e)}")

        # Return mocks if no tools or no containers found
        if not containers:
            return MOCK_CONTAINERS

        return containers

    @classmethod
    def control_container(cls, container_id: str, engine: str, action: str) -> bool:
        # Validate ID and action to prevent shell injection
        if not container_id.isalnum() or action not in ["start", "stop", "restart"]:
            return False

        if engine not in ["podman", "docker"]:
            return False

        # Fallback mocks check
        if force_mock_active() or not is_command_available(engine):
            for c in MOCK_CONTAINERS:
                if c.id == container_id:
                    if action == "start":
                        c.state = "running"
                        c.status = "Up Just now"
                    elif action == "stop":
                        c.state = "exited"
                        c.status = "Exited (0) Just now"
                    elif action == "restart":
                        c.state = "running"
                        c.status = "Up Just now"
                    return True
            return False

        # Run command
        cmd = [engine, action, container_id]
        code, _, stderr = run_system_command(cmd, timeout=15.0)
        
        if code != 0:
            logger.error(f"Container control failed: {stderr}")
            return False

        return True

    @classmethod
    def get_container_logs(cls, container_id: str, engine: str, tail: int = 100) -> ContainerLogsResponse:
        # Validate inputs
        if not container_id.isalnum() or engine not in ["podman", "docker"]:
            return ContainerLogsResponse(id=container_id, engine=engine, logs="Invalid parameters")

        if force_mock_active() or not is_command_available(engine):
            return ContainerLogsResponse(
                id=container_id,
                engine=engine,
                logs=f"Mock: logs for container {container_id} ({engine})\n[info] Service started successfully\n[info] Listening on 0.0.0.0\n[warning] Database connection took 150ms"
            )

        cmd = [engine, "logs", f"--tail={tail}", container_id]
        code, stdout, stderr = run_system_command(cmd, timeout=10.0)

        logs_content = stdout if code == 0 else f"Failed to fetch logs: {stderr or stdout}"
        return ContainerLogsResponse(id=container_id, engine=engine, logs=logs_content)
