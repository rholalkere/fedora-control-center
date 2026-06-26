from app.services.system import SystemService
from app.services.systemd import SystemdService
from app.services.journal import JournalService
from app.services.dnf import DnfService
from app.services.container import ContainerService
from app.services.firewall import FirewallService
from app.services.selinux import SELinuxService
from app.schemas.journal import JournalFilter

def test_system_service_metrics():
    metrics = SystemService.get_all_metrics()
    assert metrics.host.hostname is not None
    assert metrics.cpu.cores_logical >= 1
    assert metrics.ram.total > 0
    assert len(metrics.disks) >= 1
    assert len(metrics.gpu) >= 1

def test_systemd_service_list():
    services = SystemdService.list_services()
    assert len(services) > 0
    assert any(s.name == "sshd.service" for s in services)

def test_systemd_service_control_mock():
    # Test on a mock service
    res = SystemdService.control_service("nginx.service", "start")
    assert res.name == "nginx.service"
    assert res.active is True
    assert res.status_text == "active"

def test_journal_service_mock():
    filters = JournalFilter(limit=10)
    logs = JournalService.get_logs(filters)
    assert logs.count > 0
    assert len(logs.lines) > 0

def test_dnf_service_mock():
    installed = DnfService.list_installed_packages()
    assert len(installed) > 0
    updates = DnfService.check_updates()
    assert len(updates) > 0
    history = DnfService.get_update_history()
    assert len(history) > 0

def test_container_service_mock():
    containers = ContainerService.list_containers()
    assert len(containers) > 0
    assert any(c.name == "web-app" for c in containers)
    
    logs = ContainerService.get_container_logs("c1b2c3d4e5f6", "podman")
    assert logs.id == "c1b2c3d4e5f6"
    assert "Mock" in logs.logs

def test_firewall_service_mock():
    zones = FirewallService.get_zones()
    assert len(zones) > 0
    assert any(z.name == "public" for z in zones)

def test_selinux_service_mock():
    status = SELinuxService.get_status()
    assert status.enabled is True
    assert status.current_mode in ["Enforcing", "Permissive", "Disabled"]
