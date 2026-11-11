"""Automated tests for GridSentinel AI Authentication and Access Control."""

import pytest
from datetime import timedelta
import jwt
from fastapi.testclient import TestClient

from app.main import app
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from app.auth.service import authenticate_operator, get_operator_by_identifier
from app.database.init_db import init_db

init_db()
client = TestClient(app)


def test_password_hashing_and_verification():
    """Verify PBKDF2-HMAC-SHA256 password hashing and constant-time verification."""
    password = "SuperSecurePasscode@2026"
    hashed = hash_password(password)

    assert hashed.startswith("pbkdf2:sha256:100000$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False
    assert verify_password(password, "invalid_corrupted_hash") is False


def test_jwt_creation_and_decoding():
    """Verify signed JWT token encoding, decoding, and expiration validation."""
    data = {"sub": "gowtham", "clearance_level": "Level 4"}
    token = create_access_token(data, expires_delta=timedelta(minutes=15))

    payload = decode_access_token(token)
    assert payload["sub"] == "gowtham"
    assert payload["clearance_level"] == "Level 4"
    assert payload["iss"] == "gridsentinel-ai"

    # Expired token test
    expired_token = create_access_token(data, expires_delta=timedelta(minutes=-10))
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(expired_token)


def test_operator_authentication_service():
    """Verify service operator credential authentication."""
    # 1. Gowtham email
    user1 = authenticate_operator("gowtham@gridsentinel.ai", "Sentinel@2026")
    assert user1 is not None
    assert user1.operator_name == "Commander Gowtham"
    assert "Level 4" in user1.clearance_level

    # 2. Gowtham username alias
    user2 = authenticate_operator("gowtham", "Sentinel@2026")
    assert user2 is not None
    assert user2.id == user1.id

    # 3. Invalid credentials
    assert authenticate_operator("gowtham", "WrongPassword") is None
    assert authenticate_operator("unknown_operator", "Sentinel@2026") is None


def test_auth_login_endpoint():
    """Verify /api/v1/auth/login endpoint."""
    # Successful login
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "gowtham@gridsentinel.ai", "password": "Sentinel@2026", "remember_me": True},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0

    # Failed login
    resp_bad = client.post(
        "/api/v1/auth/login",
        json={"username": "gowtham@gridsentinel.ai", "password": "WrongPassword", "remember_me": False},
    )
    assert resp_bad.status_code == 401
    assert "ACCESS DENIED" in resp_bad.json()["detail"]


def test_auth_me_protected_endpoint():
    """Verify /api/v1/auth/me Bearer token access and authorization."""
    # 1. Unauthenticated request rejected
    resp_unauth = client.get("/api/v1/auth/me")
    assert resp_unauth.status_code == 401

    # 2. Authenticated request with valid token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "gowtham", "password": "Sentinel@2026"},
    )
    token = login_resp.json()["access_token"]

    resp_auth = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_auth.status_code == 200
    user_info = resp_auth.json()
    assert user_info["operator_name"] == "Commander Gowtham"
    assert user_info["node_id"] == "SENTINEL-ALPHA-07"


def test_auth_verify_endpoint():
    """Verify /api/v1/auth/verify endpoint."""
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Admin@Sentinel2026"},
    )
    token = login_resp.json()["access_token"]

    # Valid token verification
    resp_verify = client.post(
        "/api/v1/auth/verify",
        json={"access_token": token, "token_type": "bearer", "expires_in": 3600},
    )
    assert resp_verify.status_code == 200
    verify_data = resp_verify.json()
    assert verify_data["valid"] is True
    assert "Level 5" in verify_data["clearance_level"]

    # Invalid token verification
    resp_bad = client.post(
        "/api/v1/auth/verify",
        json={"access_token": "tampered_fake_jwt_token", "token_type": "bearer", "expires_in": 3600},
    )
    assert resp_bad.status_code == 200
    assert resp_bad.json()["valid"] is False

