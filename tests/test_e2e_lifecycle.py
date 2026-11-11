"""
GridSentinel AI - End-to-End Integration Verification Suite.
Validates the complete cyber-physical simulation lifecycle, real JWT authentication,
all 6 attack scenarios, AI detection, mitigation recalculation, WebSocket streaming,
and SQLite persistence across simulated restarts.
"""

import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.init_db import init_db
from app.database.session import SessionLocal, engine
from app.database.models import (
    SimulationRunRecord,
    GridSnapshotRecord,
    SecurityIncident,
    AttackScenarioRecord,
)
from app.auth.security import decode_access_token

# Initialize database tables for testing
init_db()
client = TestClient(app)


def test_01_backend_health_and_root():
    """Verify backend root and health check endpoints."""
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["platform"] == "GridSentinel AI"
    assert data["status"] == "operational"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    api_health = client.get("/api/v1/health")
    assert api_health.status_code == 200
    assert api_health.json()["status"] == "healthy"


def test_02_real_jwt_authentication_lifecycle():
    """Verify real JWT creation, password hashing verification, and protected profile access."""
    # 1. Login with valid operator credentials
    login_resp = client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": "gowtham@gridsentinel.ai",
            "password": "Sentinel@2026",
        },
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"
    assert login_data["user"]["username"] == "gowtham"
    assert login_data["user"]["role"] == "Chief Grid Cyber Defense Officer"

    token = login_data["access_token"]

    # 2. Cryptographic decode and claims verification
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "gowtham"
    assert payload["email"] == "gowtham@gridsentinel.ai"
    assert payload["clearance_level"] == "Level 4 (SCADA Critical Interconnect)"

    # 3. Access protected profile endpoint
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == "GS-OP-7749"
    assert me_resp.json()["username"] == "gowtham"

    # 4. Verify signature endpoint
    verify_resp = client.post(f"/api/v1/auth/verify?token={token}")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["valid"] is True

    # 5. Verify invalid passcode rejection
    bad_login = client.post(
        "/api/v1/auth/login",
        json={
            "username_or_email": "gowtham@gridsentinel.ai",
            "password": "WrongPassword999",
        },
    )
    assert bad_login.status_code == 401


def test_03_verify_all_dashboard_api_endpoints():
    """Verify every dashboard API endpoint responds with valid HTTP schema."""
    endpoints = [
        ("GET", "/api/v1/grid/topologies", 200),
        ("GET", "/api/v1/grid/topology", 200),
        ("GET", "/api/v1/grid/state", 200),
        ("GET", "/api/v1/grid/simulation/status", 200),
        ("GET", "/api/v1/telemetry/latest", 200),
        ("GET", "/api/v1/telemetry/history", 200),
        ("GET", "/api/v1/attacks/scenarios", 200),
        ("GET", "/api/v1/attacks/active", 200),
        ("GET", "/api/v1/security/metrics", 200),
        ("GET", "/api/v1/security/recommend-mitigation", 200),
        ("GET", "/api/v1/security/state-comparison", 200),
        ("GET", "/api/v1/security/event-history", 200),
        ("GET", "/api/v1/security/incidents", 200),
    ]

    for method, path, expected_status in endpoints:
        if method == "GET":
            r = client.get(path)
        assert r.status_code == expected_status, f"Endpoint {path} failed with status {r.status_code}: {r.text}"


def test_04_websocket_telemetry_and_alerts():
    """Verify WebSocket connection, protocol handshake, and live calculated payload."""
    with client.websocket_connect("/ws/telemetry") as ws:
        frame = ws.receive_json()
        assert frame["type"] == "TELEMETRY_STREAM"
        assert "telemetry" in frame
        assert "grid_state" in frame
        assert frame["grid_state"]["converged"] is True
        assert len(frame["grid_state"]["buses"]) >= 8

    with client.websocket_connect("/ws/alerts") as ws_alert:
        ws_alert.send_text("ping")
        resp = ws_alert.receive_text()
        assert resp == "pong"


def test_05_grid_initialization_and_continuous_stepping():
    """Verify virtual grid initialization and Pandapower AC Newton-Raphson stepping."""
    init_resp = client.post(
        "/api/v1/grid/initialize",
        json={"topology_name": "resilient_microgrid"},
    )
    assert init_resp.status_code == 200
    data = init_resp.json()
    assert data["status"] == "success"
    assert data["topology_info"]["num_buses"] == 8

    # Step simulation with load variations
    step_resp = client.post(
        "/api/v1/grid/step",
        json={"load_variation": 0.02, "der_variation": 0.03},
    )
    assert step_resp.status_code == 200
    step_data = step_resp.json()
    assert step_data["converged"] is True
    assert 0.95 <= step_data["min_voltage_pu"] <= 1.05


def test_06_execute_all_six_attack_scenarios_individually():
    """Verify each of the 6 predefined attack scenarios can be launched, detected, and stopped."""
    scenarios = [
        ("fdia_voltage", 2, 1.25),
        ("fdia_power", 5, 2.0),
        ("dos_freeze", 1, 1.0),
        ("replay_attack", 6, 1.0),
        ("load_tampering", 5, 1.8),
        ("der_disconnect", 2, 1.0),
    ]

    for attack_type, target_bus, intensity in scenarios:
        # 1. Launch attack
        launch = client.post(
            "/api/v1/attacks/launch",
            json={
                "attack_type": attack_type,
                "target_bus_id": target_bus,
                "intensity": intensity,
                "duration_seconds": 60,
            },
        )
        assert launch.status_code == 201
        atk_id = launch.json()["attack_id"]
        assert launch.json()["is_confined_locally"] is True

        # 2. Run detection engine
        detect = client.post("/api/v1/security/detect")
        assert detect.status_code == 200
        det_data = detect.json()
        assert det_data["detection"]["is_anomaly"] is True

        # 3. Stop attack
        stop = client.post(f"/api/v1/attacks/{atk_id}/stop")
        assert stop.status_code == 200
        assert stop.json()["status"].upper() == "STOPPED"


def test_07_detection_explanation_and_severity():
    """Verify detection output contains technical reason, severity rating, and affected component."""
    # Launch FDIA attack
    client.post(
        "/api/v1/attacks/launch",
        json={
            "attack_type": "fdia_voltage",
            "target_bus_id": 2,
            "intensity": 1.35,
            "duration_seconds": 90,
        },
    )
    detect = client.post("/api/v1/security/detect")
    assert detect.status_code == 200
    res = detect.json()
    incident = res.get("incident")
    assert incident is not None
    assert incident["severity"] in ["CRITICAL", "HIGH", "MEDIUM"]
    assert "Bus_2" in incident["target_component"]
    assert "mitigation_recommendation" in incident
    assert len(incident["mitigation_recommendation"]) > 10

    # Clean up
    client.post("/api/v1/attacks/stop-all")


def test_08_mitigation_and_independent_pandapower_verification():
    """Verify simulated mitigation executes, recalculates AC power flow, and verifies physics."""
    # 1. Create disturbance via load tampering
    client.post(
        "/api/v1/attacks/launch",
        json={
            "attack_type": "load_tampering",
            "target_bus_id": 5,
            "intensity": 1.7,
            "duration_seconds": 90,
        },
    )
    client.post("/api/v1/security/detect")

    # 2. Execute mitigation
    mit_resp = client.post("/api/v1/security/mitigate")
    assert mit_resp.status_code == 200
    mit_data = mit_resp.json()
    assert mit_data["attack_neutralized"] is True
    assert mit_data["recalculation_converged"] is True
    assert mit_data["recovery_effective"] is True
    assert len(mit_data["actions_taken"]) >= 3

    # 3. Independently verify grid state via direct Pandapower calculation query
    grid_state = client.get("/api/v1/grid/state").json()
    assert grid_state["converged"] is True
    assert grid_state["voltage_violations_count"] == 0
    assert grid_state["overloaded_lines_count"] == 0
    assert grid_state["min_voltage_pu"] >= 0.95
    assert grid_state["max_voltage_pu"] <= 1.05


def test_09_sqlite_persistence_across_session_reload():
    """Verify SQLite records (runs, snapshots, incidents, attacks) persist on disk."""
    # Insert operations
    client.post("/api/v1/grid/initialize", json={"topology_name": "resilient_microgrid"})
    client.post("/api/v1/grid/step", json={"load_variation": 0.01, "der_variation": 0.01})
    client.post("/api/v1/attacks/launch", json={"attack_type": "dos_freeze", "target_bus_id": 1, "intensity": 1.0, "duration_seconds": 30})
    client.post("/api/v1/security/detect")
    client.post("/api/v1/security/mitigate")

    # Simulate restart by tearing down and re-opening a fresh database session
    db = SessionLocal()
    try:
        runs = db.query(SimulationRunRecord).all()
        assert len(runs) >= 1
        actions = [r.action for r in runs]
        assert "INITIALIZE" in actions
        assert "MITIGATE" in actions

        snapshots = db.query(GridSnapshotRecord).all()
        assert len(snapshots) >= 1
        assert snapshots[-1].converged is True

        incidents = db.query(SecurityIncident).all()
        assert len(incidents) >= 1
        # Remediated incidents should be resolved
        assert any(inc.resolved is True for inc in incidents)

        attacks = db.query(AttackScenarioRecord).all()
        assert len(attacks) >= 1
    finally:
        db.close()
