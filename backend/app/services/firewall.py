import logging
from typing import List, Dict
from app.schemas.firewall import FirewallZoneInfo, FirewallActionResponse
from app.services.utils import run_system_command, is_command_available

logger = logging.getLogger("fedora_control_center")

# Mock zones
MOCK_ZONES: Dict[str, dict] = {
    "public": {
        "active": True,
        "services": ["ssh", "dhcpv6-client", "cockpit"],
        "ports": ["8000/tcp", "80/tcp", "443/tcp"],
        "interfaces": ["enp3s0"],
        "sources": []
    },
    "fedora-workstation": {
        "active": False,
        "services": ["ssh", "dhcpv6-client", "mdns", "samba-client"],
        "ports": [],
        "interfaces": [],
        "sources": []
    },
    "trusted": {
        "active": False,
        "services": ["all"],
        "ports": [],
        "interfaces": [],
        "sources": []
    }
}

class FirewallService:
    @classmethod
    def is_firewalld_available(cls) -> bool:
        from app.services.utils import force_mock_active
        return is_command_available("firewall-cmd") and not force_mock_active()

    @classmethod
    def get_zones(cls) -> List[FirewallZoneInfo]:
        if not cls.is_firewalld_available():
            logger.info("firewall-cmd not available. Returning mock zones.")
            return [
                FirewallZoneInfo(
                    name=name,
                    active=data["active"],
                    services=data["services"],
                    ports=data["ports"],
                    interfaces=data["interfaces"],
                    sources=data["sources"]
                )
                for name, data in MOCK_ZONES.items()
            ]

        # Fetch all zones
        code, stdout, _ = run_system_command(["firewall-cmd", "--get-zones"], timeout=5.0)
        if code != 0:
            return []

        zones_list = stdout.strip().split()
        
        # Fetch active zones to mark active ones
        active_code, active_stdout, _ = run_system_command(["firewall-cmd", "--get-active-zones"], timeout=5.0)
        active_zones = []
        if active_code == 0:
            # Active zones format typically prints zone name, followed by interfaces/sources on subsequent lines
            # A simpler way is parsing lines that don't start with space
            for line in active_stdout.strip().split("\n"):
                if line and not line.startswith(" "):
                    active_zones.append(line.strip())

        zones = []
        for zone_name in zones_list:
            # Query services
            _, s_out, _ = run_system_command(["firewall-cmd", f"--zone={zone_name}", "--list-services"], timeout=3.0)
            # Query ports
            _, p_out, _ = run_system_command(["firewall-cmd", f"--zone={zone_name}", "--list-ports"], timeout=3.0)
            # Query interfaces
            _, i_out, _ = run_system_command(["firewall-cmd", f"--zone={zone_name}", "--list-interfaces"], timeout=3.0)
            # Query sources
            _, src_out, _ = run_system_command(["firewall-cmd", f"--zone={zone_name}", "--list-sources"], timeout=3.0)

            zones.append(
                FirewallZoneInfo(
                    name=zone_name,
                    active=(zone_name in active_zones),
                    services=s_out.strip().split() if s_out.strip() else [],
                    ports=p_out.strip().split() if p_out.strip() else [],
                    interfaces=i_out.strip().split() if i_out.strip() else [],
                    sources=src_out.strip().split() if src_out.strip() else []
                )
            )
        return zones

    @classmethod
    def manage_port(cls, zone: str, port: str, protocol: str, action: str) -> FirewallActionResponse:
        # Validate inputs
        if not zone.replace("-", "").isalnum() or not port.replace("-", "").isalnum() or protocol not in ["tcp", "udp"]:
            return FirewallActionResponse(success=False, message="Invalid parameters")

        if action not in ["add", "remove"]:
            return FirewallActionResponse(success=False, message="Invalid action")

        if not cls.is_firewalld_available():
            # Apply to mock
            if zone in MOCK_ZONES:
                rule = f"{port}/{protocol}"
                ports_list = MOCK_ZONES[zone]["ports"]
                if action == "add" and rule not in ports_list:
                    ports_list.append(rule)
                elif action == "remove" and rule in ports_list:
                    ports_list.remove(rule)
                return FirewallActionResponse(success=True, message=f"Mock: Port {port}/{protocol} {action}ed in zone {zone}")
            return FirewallActionResponse(success=False, message=f"Zone {zone} not found")

        # Run firewall-cmd
        cmd = ["firewall-cmd", f"--zone={zone}", f"--{action}-port={port}/{protocol}", "--permanent"]
        code, stdout, stderr = run_system_command(cmd, timeout=8.0)

        if code != 0:
            return FirewallActionResponse(success=False, message=f"Failed to modify port: {stderr or stdout}")

        # Reload firewall
        cls._reload_firewall()
        return FirewallActionResponse(success=True, message=f"Port {port}/{protocol} {action}ed successfully in zone {zone}")

    @classmethod
    def manage_service(cls, zone: str, service: str, action: str) -> FirewallActionResponse:
        # Validate inputs
        if not zone.replace("-", "").isalnum() or not service.replace("-", "").replace("_", "").isalnum():
            return FirewallActionResponse(success=False, message="Invalid parameters")

        if action not in ["add", "remove"]:
            return FirewallActionResponse(success=False, message="Invalid action")

        if not cls.is_firewalld_available():
            if zone in MOCK_ZONES:
                services_list = MOCK_ZONES[zone]["services"]
                if action == "add" and service not in services_list:
                    services_list.append(service)
                elif action == "remove" and service in services_list:
                    services_list.remove(service)
                return FirewallActionResponse(success=True, message=f"Mock: Service {service} {action}ed in zone {zone}")
            return FirewallActionResponse(success=False, message=f"Zone {zone} not found")

        cmd = ["firewall-cmd", f"--zone={zone}", f"--{action}-service={service}", "--permanent"]
        code, stdout, stderr = run_system_command(cmd, timeout=8.0)

        if code != 0:
            return FirewallActionResponse(success=False, message=f"Failed to modify service: {stderr or stdout}")

        cls._reload_firewall()
        return FirewallActionResponse(success=True, message=f"Service {service} {action}ed successfully in zone {zone}")

    @classmethod
    def _reload_firewall(cls):
        run_system_command(["firewall-cmd", "--reload"], timeout=5.0)
