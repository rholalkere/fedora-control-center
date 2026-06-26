from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.repositories.user import UserRepository

def get_auth_headers(client: TestClient, db: Session, role="admin") -> dict:
    username = f"user_{role}"
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
