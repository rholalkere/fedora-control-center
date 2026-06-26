import logging
from typing import List, Dict, Optional
from app.schemas.service import ServiceInfo, ServiceStatusResponse
from app.services.utils import run_system_command, is_command_available, force_mock_active

logger = logging.getLogger("fedora_control_center")

# Mock services list for container/fallback environments
MOCK_SERVICES: Dict[str, Dict[str, str]] = {
    "sshd.service": {
        "description": "OpenSSH server daemon",
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "enabled_state": "enabled"
    },
    "firewalld.service": {
        "description": "firewalld - dynamic firewall daemon",
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "enabled_state": "enabled"
    },
    "nginx.service": {
        "description": "Nginx HTTP Server",
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "enabled_state": "disabled"
    },
    "docker.service": {
        "description": "Docker Application Container Engine",
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "enabled_state": "enabled"
    },
    "podman.service": {
        "description": "Podman API Service",
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "enabled_state": "disabled"
    },
    "ollama.service": {
        "description": "Ollama Service",
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "enabled_state": "enabled"
    },
    "NetworkManager.service": {
        "description": "Network Manager",
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "enabled_state": "enabled"
    },
    "auditd.service": {
        "description": "Security Auditing Service",
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "enabled_state": "enabled"
    }
}

class SystemdService:
    @classmethod
    def is_systemd_available(cls) -> bool:
        if force_mock_active():
            return False
        import os
        return is_command_available("systemctl") and os.path.exists("/run/systemd/system")

    @classmethod
    def list_services(cls, search: Optional[str] = None) -> List[ServiceInfo]:
        if not cls.is_systemd_available():
            logger.info("systemctl not available. Returning mock services.")
            services = []
            for name, data in MOCK_SERVICES.items():
                if search and search.lower() not in name.lower() and search.lower() not in data["description"].lower():
                    continue
                services.append(
                    ServiceInfo(
                        name=name,
                        description=data["description"],
                        load_state=data["load_state"],
                        active_state=data["active_state"],
                        sub_state=data["sub_state"],
                        enabled_state=data["enabled_state"]
                    )
                )
            return services

        # Fetch active/inactive service states
        code, stdout, _ = run_system_command([
            "systemctl", "list-units", "--type=service", "--all", "--no-legend", "--no-pager"
        ], timeout=5.0)

        # Fetch enabled states
        code_files, stdout_files, _ = run_system_command([
            "systemctl", "list-unit-files", "--type=service", "--no-legend", "--no-pager"
        ], timeout=5.0)

        enabled_map = {}
        if code_files == 0:
            for line in stdout_files.strip().split("\n"):
                if not line:
                    continue
                parts = line.split()
                if len(parts) >= 2:
                    enabled_map[parts[0]] = parts[1]

        services = []
        if code == 0:
            for line in stdout.strip().split("\n"):
                if not line:
                    continue
                # Format: UNIT LOAD ACTIVE SUB DESCRIPTION
                # Since DESCRIPTION can have spaces, let's split the first 4 columns, then take the rest as desc.
                parts = line.split(maxsplit=4)
                if len(parts) >= 4:
                    unit_name = parts[0]
                    # We might have bullet marks or escapes in systemctl, let's clean
                    if unit_name.startswith("●"):
                        unit_name = unit_name.lstrip("●").strip()
                        # Shift parts since we had bullet
                        parts = line.replace("●", "").split(maxsplit=4)
                        unit_name = parts[0]

                    load_state = parts[1]
                    active_state = parts[2]
                    sub_state = parts[3]
                    description = parts[4] if len(parts) > 4 else ""

                    if search and search.lower() not in unit_name.lower() and search.lower() not in description.lower():
                        continue

                    # Clean description
                    description = description.strip()

                    enabled_state = enabled_map.get(unit_name, "unknown")

                    services.append(
                        ServiceInfo(
                            name=unit_name,
                            description=description,
                            load_state=load_state,
                            active_state=active_state,
                            sub_state=sub_state,
                            enabled_state=enabled_state
                        )
                    )
        
        # Fallback if systemctl command fails or returns empty
        if not services:
            services = cls.list_services(search=search) # will default to mock
            
        return services

    @classmethod
    def control_service(cls, service_name: str, action: str) -> ServiceStatusResponse:
        # Prevent injection by validating service name format
        if not service_name.replace(".", "").replace("-", "").replace("@", "").isalnum():
            return ServiceStatusResponse(
                name=service_name,
                active=False,
                status_text="failed",
                raw_output="Invalid service name format"
            )

        if not cls.is_systemd_available():
            if service_name in MOCK_SERVICES:
                mock = MOCK_SERVICES[service_name]
                if action == "start":
                    mock["active_state"] = "active"
                    mock["sub_state"] = "running"
                elif action == "stop":
                    mock["active_state"] = "inactive"
                    mock["sub_state"] = "dead"
                elif action == "restart":
                    mock["active_state"] = "active"
                    mock["sub_state"] = "running"
                
                return ServiceStatusResponse(
                    name=service_name,
                    active=(mock["active_state"] == "active"),
                    status_text=mock["active_state"],
                    raw_output=f"Mock: service '{service_name}' {action}ed successfully."
                )
            return ServiceStatusResponse(
                name=service_name,
                active=False,
                status_text="unknown",
                raw_output=f"Mock service '{service_name}' not found."
            )

        # Run systemctl action
        # Note: writing "sudo systemctl" or "systemctl" depending on access.
        # Let's try running systemctl directly first.
        code, stdout, stderr = run_system_command(["systemctl", action, service_name], timeout=8.0)
        
        # If permission denied, try with sudo if needed, or return error.
        # But we assume the process has systemd manager privileges (or is running as root inside container/host).
        if code != 0:
            raw_output = stderr if stderr else stdout
            return ServiceStatusResponse(
                name=service_name,
                active=False,
                status_text="failed",
                raw_output=f"Failed to {action} service: {raw_output}"
            )

        # Get status
        status_code, status_stdout, status_stderr = run_system_command(["systemctl", "status", service_name], timeout=5.0)
        is_active = (status_code == 0)
        status_text = "active" if is_active else "inactive"

        return ServiceStatusResponse(
            name=service_name,
            active=is_active,
            status_text=status_text,
            raw_output=status_stdout if status_stdout else status_stderr
        )
