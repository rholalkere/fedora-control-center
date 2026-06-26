from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.repositories.user import UserRepository
from app.core.security import verify_password

def test_create_user(db: Session):
    user = UserRepository.create(db, "test_user", "password123", "viewer")
    assert user.username == "test_user"
    assert user.role == "viewer"
    assert verify_password("password123", user.hashed_password)

def test_login_success(client: TestClient, db: Session):
    # Seed user
    UserRepository.create(db, "admin_test", "fedora_pass", "admin")
    
    # Authenticate
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin_test", "password": "fedora_pass"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"

def test_login_failed(client: TestClient, db: Session):
    # Seed user
    UserRepository.create(db, "viewer_test", "pass123", "viewer")
    
    # Authenticate with wrong password
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "viewer_test", "password": "wrong_password"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

def test_get_me_protected(client: TestClient, db: Session):
    UserRepository.create(db, "test_user", "password123", "viewer")
    
    # Test unauthenticated access
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401  # Not authenticated

    # Test authenticated access
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "test_user", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "test_user"
    assert response.json()["role"] == "viewer"
