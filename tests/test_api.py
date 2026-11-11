"""Integration tests for GridSentinel AI REST API endpoints."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.init_db import init_db

# Initialize database schema for tests
init_db()

client = TestClient(app)


def test_grid_endpoints():
    """Verify topology and power flow state endpoints."""
    # Topology
    resp = client.get("/api/v1/grid/topology")
    assert resp.status_code == 200
    top_data = resp.json()
    assert top_data["num_buses"] > 0
    assert top_data["num_lines"] > 0

    # Physical state
    resp_state = client.get("/api/v1/grid/state")
    assert resp_state.status_code == 200
    state_data = resp_state.json()
    assert state_data["converged"] is True
    assert "Newton-Raphson" in state_data["algorithm"]
    assert len(state_data["buses"]) == top_data["num_buses"]

    # Step simulation
    resp_step = client.post("/api/v1/grid/step", json={"load_variation": 0.02, "der_variation": 0.03})
    assert resp_step.status_code == 200
    assert resp_step.json()["converged"] is True


def test_telemetry_endpoints():
    """Verify telemetry acquisition and sampling endpoints."""
    resp = client.get("/api/v1/telemetry/latest")
    assert resp.status_code == 200
    packet = resp.json()
    assert "sequence_id" in packet
    assert len(packet["buses"]) > 0

    # On-demand sample and DB persistence
    resp_sample = client.post("/api/v1/telemetry/sample")
    assert resp_sample.status_code == 200
    assert resp_sample.json()["sequence_id"] > 0


def test_attack_and_security_flow():
    """Verify end-to-end attack launch, detection, incident logging, and neutralization."""
    # 1. Launch virtual FDIA attack
    launch_resp = client.post(
        "/api/v1/attacks/launch",
        json={
            "attack_type": "fdia_voltage",
            "target_bus_id": 1,
            "intensity": 2.0,
            "duration_seconds": 60,
        },
    )
    assert launch_resp.status_code == 201
    attack_data = launch_resp.json()
    attack_id = attack_data["attack_id"]
    assert attack_data["is_confined_locally"] is True

    # 2. Check active attacks
    active_resp = client.get("/api/v1/attacks/active")
    assert active_resp.status_code == 200
    active_list = active_resp.json()
    assert any(a["attack_id"] == attack_id for a in active_list)

    # 3. Trigger AI detection
    detect_resp = client.post("/api/v1/security/detect")
    assert detect_resp.status_code == 200
    detect_body = detect_resp.json()
    assert "detection" in detect_body
    assert detect_body["detection"]["is_anomaly"] is True

    # 4. Stop attack
    stop_resp = client.post(f"/api/v1/attacks/{attack_id}/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["status"] == "STOPPED"

    # 5. Verify security incident was recorded
    inc_resp = client.get("/api/v1/security/incidents")
    assert inc_resp.status_code == 200
    incidents = inc_resp.json()
    assert len(incidents) > 0


def test_model_metrics_endpoint():
    """Verify AI model metrics endpoint returns legitimate metrics."""
    resp = client.get("/api/v1/security/metrics")
    assert resp.status_code == 200
    metrics = resp.json()
    assert "accuracy" in metrics
    assert "f1_score" in metrics
    assert len(metrics["features_used"]) == 15

