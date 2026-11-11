"""Integration and functional tests for the GridSentinel AI Interactive Digital-Twin."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.init_db import init_db

init_db()
client = TestClient(app)


def test_topologies_and_initialization():
    """Verify topology selection and grid re-initialization."""
    # List topologies
    resp = client.get("/api/v1/grid/topologies")
    assert resp.status_code == 200
    topos = resp.json()
    assert len(topos) >= 3
    topo_ids = [t["id"] for t in topos]
    assert "resilient_microgrid" in topo_ids
    assert "cigre_microgrid" in topo_ids

    # Initialize resilient microgrid
    init_resp = client.post("/api/v1/grid/initialize", json={"topology_name": "resilient_microgrid"})
    assert init_resp.status_code == 200
    init_data = init_resp.json()
    assert init_data["status"] == "success"
    assert init_data["topology_info"]["num_buses"] == 8
    assert init_data["state_summary"]["converged"] is True


def test_simulation_controls():
    """Verify start, pause, resume, reset, and speed simulation controls."""
    # Start simulation
    start_resp = client.post("/api/v1/grid/simulation/start")
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "RUNNING"

    # Status check
    status_resp = client.get("/api/v1/grid/simulation/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "RUNNING"

    # Pause simulation
    pause_resp = client.post("/api/v1/grid/simulation/pause")
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"] == "PAUSED"

    # Speed adjustment
    speed_resp = client.post("/api/v1/grid/simulation/speed", json={"speed_hz": 2.5})
    assert speed_resp.status_code == 200
    assert speed_resp.json()["speed_hz"] == 2.5

    # Resume simulation
    resume_resp = client.post("/api/v1/grid/simulation/resume")
    assert resume_resp.status_code == 200
    assert resume_resp.json()["status"] == "RUNNING"

    # Reset simulation
    reset_resp = client.post("/api/v1/grid/simulation/reset")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "PAUSED"
    assert reset_resp.json()["step_count"] == 0


def test_predefined_attack_scenarios():
    """Verify catalog of supported predefined cyberattack scenarios."""
    resp = client.get("/api/v1/attacks/scenarios")
    assert resp.status_code == 200
    scenarios = resp.json()
    assert len(scenarios) >= 6
    scenario_types = [s["attack_type"] for s in scenarios]
    assert "fdia_voltage" in scenario_types
    assert "fdia_power" in scenario_types
    assert "dos_freeze" in scenario_types
    assert "replay_attack" in scenario_types
    assert "load_tampering" in scenario_types
    assert "der_disconnect" in scenario_types


def test_mitigation_workflow_and_state_comparison():
    """Verify complete attack, detection, mitigation recommendation, execution, and state comparison."""
    # 1. Launch attack
    launch_resp = client.post(
        "/api/v1/attacks/launch",
        json={
            "attack_type": "fdia_voltage",
            "target_bus_id": 2,
            "intensity": 2.5,
            "duration_seconds": 90,
        },
    )
    assert launch_resp.status_code == 201
    attack_id = launch_resp.json()["attack_id"]

    # 2. Trigger detection
    detect_resp = client.post("/api/v1/security/detect")
    assert detect_resp.status_code == 200
    detect_data = detect_resp.json()
    assert detect_data["detection"]["is_anomaly"] is True

    # 3. Request recommended mitigation plan
    rec_resp = client.get(
        "/api/v1/security/recommend-mitigation",
        params={"attack_type": "fdia_voltage", "target_component": "Bus 2 - Renewable DER"},
    )
    assert rec_resp.status_code == 200
    plan = rec_resp.json()
    assert "Bad Data" in plan["strategy_name"]
    assert len(plan["action_steps"]) > 0

    # 4. Apply simulated mitigation
    mit_resp = client.post("/api/v1/security/mitigate")
    assert mit_resp.status_code == 200
    mit_result = mit_resp.json()
    assert mit_result["attack_neutralized"] is True
    assert mit_result["recalculation_converged"] is True
    assert mit_result["recovery_effective"] is True

    # 5. Review 3-Way State Comparison
    comp_resp = client.get("/api/v1/security/state-comparison")
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert "baseline_normal" in comp_data
    assert "attacked_compromised" in comp_data
    assert "recovered_mitigated" in comp_data
    assert comp_data["recovery_effective"] is True


def test_event_history_log():
    """Verify chronological event history retrieval."""
    resp = client.get("/api/v1/security/event-history?limit=20")
    assert resp.status_code == 200
    events = resp.json()
    assert isinstance(events, list)
    if events:
        event = events[0]
        assert "id" in event
        assert "type" in event
        assert "timestamp" in event
        assert "title" in event
        assert "severity" in event


def test_simulation_runs_sqlite_persistence():
    """Verify simulation lifecycle runs and grid snapshots are persisted in SQLite."""
    from app.database.session import SessionLocal
    from app.database.models import SimulationRunRecord, GridSnapshotRecord

    # Initialize a grid run
    resp = client.post("/api/v1/grid/initialize", json={"topology_name": "resilient_microgrid"})
    assert resp.status_code == 200

    # Step simulation
    step_resp = client.post("/api/v1/grid/step", json={"load_variation": 0.01, "der_variation": 0.01})
    assert step_resp.status_code == 200

    db = SessionLocal()
    try:
        runs = db.query(SimulationRunRecord).all()
        assert len(runs) >= 1
        assert any(r.action == "INITIALIZE" for r in runs)

        snaps = db.query(GridSnapshotRecord).all()
        assert len(snaps) >= 1
        assert snaps[0].converged is True
        assert snaps[0].total_p_gen_mw > 0
    finally:
        db.close()


def test_websocket_telemetry_stream_connection():
    """Verify WebSocket endpoint streams calculated telemetry and Pandapower states."""
    with client.websocket_connect("/ws/telemetry") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "TELEMETRY_STREAM"
        assert "telemetry" in data
        assert "grid_state" in data
        assert "buses" in data["grid_state"]
        assert len(data["grid_state"]["buses"]) >= 8
        assert data["grid_state"]["converged"] is True


