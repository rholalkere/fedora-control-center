from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.repositories.user import UserRepository

def get_auth_headers(client: TestClient, db: Session, role="admin") -> dict:
    username = f"user_{role}"
    existing = UserRepository.get_by_username(db, username)
    if not existing:
        UserRepository.create(db, username, "fedora_secret", role)
    res = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": "fedora_secret"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_get_metrics_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/system/metrics", headers=headers)
    assert response.status_code == 200
    assert "cpu" in response.json()
    assert "ram" in response.json()

def test_list_services_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/services/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_query_logs_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    payload = {"limit": 5}
    response = client.post("/api/v1/logs/query", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["count"] > 0

def test_get_packages_updates_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/packages/updates", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_containers_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/containers/", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_firewall_zones_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/firewall/zones", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_get_selinux_status_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/selinux/status", headers=headers)
    assert response.status_code == 200
    assert "current_mode" in response.json()

def test_viewer_role_access_denied(client: TestClient, db: Session):
    # Viewer role
    headers = get_auth_headers(client, db, role="viewer")
    
    # Try modifying SELinux (Admin only)
    response = client.post("/api/v1/selinux/mode", json={"mode": "permissive"}, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "The user does not have enough privileges"

def test_get_processes_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/system/processes", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0
    assert "pid" in response.json()[0]

def test_kill_process_failed_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db, role="admin")
    # Kill non-existent PID
    response = client.post("/api/v1/system/processes/kill", json={"pid": 99999}, headers=headers)
    assert response.status_code == 404

def test_power_profile_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    response = client.get("/api/v1/system/power-profile", headers=headers)
    assert response.status_code == 200
    assert "active_profile" in response.json()
    
    # Set power profile as admin
    admin_headers = get_auth_headers(client, db, role="admin")
    res_set = client.post("/api/v1/system/power-profile", json={"profile": "balanced"}, headers=admin_headers)
    assert res_set.status_code == 200

def test_dns_blocklist_api(client: TestClient, db: Session):
    headers = get_auth_headers(client, db)
    # Get current blocks
    response = client.get("/api/v1/network/dns-blocklist", headers=headers)
    assert response.status_code == 200
    
    # Block a domain as admin
    admin_headers = get_auth_headers(client, db, role="admin")
    block_res = client.post("/api/v1/network/dns-blocklist/block", json={"domain": "facebook.com", "reason": "Social media ban"}, headers=admin_headers)
    assert block_res.status_code == 200
    
    # Verify it is in list
    response = client.get("/api/v1/network/dns-blocklist", headers=headers)
    assert response.status_code == 200
    domains = [d["domain"] for d in response.json()]
    assert "facebook.com" in domains

    # Unblock the domain
    unblock_res = client.post("/api/v1/network/dns-blocklist/unblock", json={"domain": "facebook.com"}, headers=admin_headers)
    assert unblock_res.status_code == 200

