"""Tests for system health check endpoints and safety confinement."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root status endpoint returns operational metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["platform"] == "GridSentinel AI"
    assert data["status"] == "operational"
    assert "api_v1" in data


def test_health_check_endpoint():
    """Verify health check endpoint reports valid component states and safety bounds."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ("healthy", "degraded")
    assert data["platform"] == "GridSentinel AI"
    
    # Verify strict virtual confinement assertions
    safety = data["safety_confinement"]
    assert safety["real_infrastructure_connected"] is False
    assert safety["virtual_environment_confined"] is True
    assert "Pandapower" in safety["power_flow_physics"]

    # Verify component readiness
    components = data["components"]
    assert components["database"]["status"] == "up"
    assert components["grid_simulator"]["power_flow_converged"] is True
    assert components["ai_cybersecurity_detector"]["status"] == "ready"


def test_api_v1_health_check():
    """Verify health check under /api/v1/health prefix."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] in ("healthy", "degraded")

