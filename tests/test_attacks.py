"""Tests for cyber attack simulation vectors and local confinement."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.grid_simulation.simulator import GridSimulator
from app.attack_simulation.engine import AttackEngine
from app.attack_simulation.schemas import AttackLaunchRequest, AttackType
from app.core.exceptions import AttackExecutionError
from app.telemetry.collector import TelemetryCollector

client = TestClient(app)


def test_fdia_voltage_attack_confinement():
    """Verify FDIA alters targeted bus telemetry while remaining strictly virtual."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    engine = AttackEngine(simulator=sim)
    collector = TelemetryCollector(simulator=sim)
    collector.set_attack_engine(engine)

    # Sample normal telemetry
    clean_sample = collector.sample_telemetry()
    bus_4_clean = next(b for b in clean_sample.buses if b.bus_id == 4)
    clean_vm = bus_4_clean.vm_pu

    # Launch virtual FDIA targeting Bus 4
    req = AttackLaunchRequest(
        attack_type=AttackType.FDIA_VOLTAGE,
        target_bus_id=4,
        intensity=1.5,
        duration_seconds=60,
    )
    attack_info = engine.launch_attack(req)
    assert attack_info.is_confined_locally is True
    assert attack_info.status == "ACTIVE"

    # Sample attacked telemetry
    attacked_sample = collector.sample_telemetry()
    bus_4_attacked = next(b for b in attacked_sample.buses if b.bus_id == 4)

    # Injected voltage should be elevated and flagged as spoofed
    assert bus_4_attacked.is_spoofed is True
    assert bus_4_attacked.vm_pu > clean_vm

    # Stop attack
    engine.stop_attack(attack_info.attack_id)
    assert len(engine.get_active_attacks()) == 0


def test_dos_freeze_attack():
    """Verify DoS freeze attack keeps sensor value static across simulation steps."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    engine = AttackEngine(simulator=sim)
    collector = TelemetryCollector(simulator=sim)
    collector.set_attack_engine(engine)

    req = AttackLaunchRequest(
        attack_type=AttackType.DOS_FREEZE,
        target_bus_id=2,
        duration_seconds=30,
    )
    engine.launch_attack(req)

    # Sample consecutive readings
    sample1 = collector.sample_telemetry()
    sim.step()
    sample2 = collector.sample_telemetry()

    b2_s1 = next(b for b in sample1.buses if b.bus_id == 2)
    b2_s2 = next(b for b in sample2.buses if b.bus_id == 2)

    assert b2_s1.is_spoofed is True
    assert b2_s2.is_spoofed is True
    assert b2_s1.vm_pu == b2_s2.vm_pu  # Frozen reading

    engine.stop_all_attacks()


def test_load_tampering_cyber_physical_impact():
    """Verify load tampering causes genuine physical load surge in pandapower."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    engine = AttackEngine(simulator=sim)

    initial_p = sim.get_state_summary().total_load_mw

    req = AttackLaunchRequest(
        attack_type=AttackType.LOAD_TAMPERING,
        target_bus_id=5,
        intensity=2.0,
        duration_seconds=30,
    )
    attack_info = engine.launch_attack(req)

    tampered_p = sim.get_state_summary().total_load_mw
    assert tampered_p > initial_p

    # Neutralize attack
    engine.stop_attack(attack_info.attack_id)
    restored_p = sim.get_state_summary().total_load_mw
    assert abs(restored_p - initial_p) < 0.1


def test_fdia_power_attack_configurable():
    """Scenario 1: False Data Injection (FDIA) targeting power measurements with configurable target & magnitude."""
    sim = GridSimulator(topology_name="ieee14")
    engine = AttackEngine(simulator=sim)
    collector = TelemetryCollector(simulator=sim)
    collector.set_attack_engine(engine)

    clean_sample = collector.sample_telemetry()
    bus_2_clean = next(b for b in clean_sample.buses if b.bus_id == 2)
    clean_p = bus_2_clean.p_mw

    req = AttackLaunchRequest(
        attack_type=AttackType.FDIA_POWER,
        target_bus_id=2,
        intensity=1.8,
        magnitude=4.5,
        duration_seconds=45,
    )
    attack_info = engine.launch_attack(req)
    assert attack_info.is_confined_locally is True
    assert attack_info.scenario == "False Data Injection (FDIA - Power)"
    assert attack_info.target_component == "Bus_2"
    assert attack_info.magnitude == 4.5
    assert attack_info.duration_seconds == 45

    # Check baseline and injected values recorded
    attacked_sample = collector.sample_telemetry()
    bus_2_attacked = next(b for b in attacked_sample.buses if b.bus_id == 2)
    assert bus_2_attacked.is_spoofed is True
    assert bus_2_attacked.p_mw > clean_p

    # Check attack record has recorded baseline & injected values
    assert "p_mw" in attack_info.baseline_values or "p_mw" in engine.active_attacks[attack_info.attack_id].baseline_values
    active_atk = engine.active_attacks[attack_info.attack_id]
    assert active_atk.injected_values["p_mw"] > active_atk.baseline_values["p_mw"]

    engine.stop_attack(attack_info.attack_id)


def test_replay_attack_substitutes_previous_telemetry():
    """Scenario 2: Replay attack substituting previous telemetry readings for current readings."""
    sim = GridSimulator(topology_name="ieee14")
    engine = AttackEngine(simulator=sim)
    collector = TelemetryCollector(simulator=sim)
    collector.set_attack_engine(engine)

    req = AttackLaunchRequest(
        attack_type=AttackType.REPLAY_ATTACK,
        target_bus_id=3,
        duration_seconds=60,
    )
    attack_info = engine.launch_attack(req)
    assert attack_info.is_confined_locally is True
    assert attack_info.scenario == "Sensor Telemetry Replay Attack"

    # Step simulation to vary the real state
    sim.step(load_noise_std=0.05, der_variation=0.05)
    sample = collector.sample_telemetry()
    bus_3 = next(b for b in sample.buses if b.bus_id == 3)
    assert bus_3.is_spoofed is True

    # Check baseline and injected values recorded on attack instance
    active_atk = engine.active_attacks[attack_info.attack_id]
    assert "vm_pu" in active_atk.baseline_values
    assert "vm_pu" in active_atk.injected_values

    engine.stop_attack(attack_info.attack_id)


def test_load_manipulation_scenario_on_ieee14():
    """Scenario 3: Controlled load manipulation on virtual IEEE 14-bus grid."""
    sim = GridSimulator(topology_name="ieee14")
    engine = AttackEngine(simulator=sim)

    initial_load = sim.get_state_summary().total_load_mw

    # Bus 2 has connected load in IEEE 14-bus
    req = AttackLaunchRequest(
        attack_type=AttackType.LOAD_MANIPULATION,
        target_bus_id=2,
        intensity=2.0,
        magnitude=1.8,
        duration_seconds=60,
    )
    attack_info = engine.launch_attack(req)
    assert attack_info.is_confined_locally is True
    assert "Load Manipulation" in attack_info.scenario

    # Pandapower power flow should recalculate with higher demand
    tampered_load = sim.get_state_summary().total_load_mw
    assert tampered_load > initial_load

    # Verify baseline and injected values recorded
    assert "p_mw" in attack_info.baseline_values
    assert "p_mw" in attack_info.injected_values
    assert attack_info.injected_values["p_mw"] > attack_info.baseline_values["p_mw"]

    # Restore nominal
    engine.stop_attack(attack_info.attack_id)
    restored_load = sim.get_state_summary().total_load_mw
    assert abs(restored_load - initial_load) < 0.1


def test_attack_invalid_inputs_validation():
    """Verify input validation rejects out-of-bounds target components and invalid parameters."""
    sim = GridSimulator(topology_name="ieee14")
    engine = AttackEngine(simulator=sim)

    # 1. Invalid bus ID (IEEE 14-bus has buses 0 to 13)
    with pytest.raises(AttackExecutionError) as exc_info:
        engine.launch_attack(
            AttackLaunchRequest(
                attack_type=AttackType.FDIA_VOLTAGE,
                target_bus_id=99,
                duration_seconds=60,
            )
        )
    assert "out of bounds" in str(exc_info.value).lower()

    # 2. Negative bus ID
    with pytest.raises(AttackExecutionError) as exc_info:
        engine.launch_attack(
            AttackLaunchRequest(
                attack_type=AttackType.FDIA_VOLTAGE,
                target_bus_id=-1,
                duration_seconds=60,
            )
        )
    assert "out of bounds" in str(exc_info.value).lower()

    # 3. Invalid line ID
    with pytest.raises(AttackExecutionError) as exc_info:
        engine.launch_attack(
            AttackLaunchRequest(
                attack_type=AttackType.FDIA_VOLTAGE,
                target_line_id=100,
                duration_seconds=60,
            )
        )
    assert "out of bounds" in str(exc_info.value).lower()

    # 4. Invalid duration (0 seconds)
    with pytest.raises(Exception):
        engine.launch_attack(
            AttackLaunchRequest(
                attack_type=AttackType.FDIA_VOLTAGE,
                target_bus_id=2,
                duration_seconds=0,
            )
        )


def test_attack_api_lifecycle_and_history():
    """Verify complete API lifecycle: launch, history retrieval with baseline/injected values, and stop."""
    # 1. Launch FDIA
    launch_resp = client.post(
        "/api/v1/attacks/launch",
        json={
            "attack_type": "fdia_power",
            "target_bus_id": 2,
            "intensity": 1.5,
            "magnitude": 3.0,
            "duration_seconds": 60,
        },
    )
    assert launch_resp.status_code == 201
    atk_data = launch_resp.json()
    atk_id = atk_data["attack_id"]
    assert atk_data["is_confined_locally"] is True
    assert atk_data["target_component"] == "Bus_2"

    # 2. Retrieve attack history
    history_resp = client.get("/api/v1/attacks/history")
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) > 0

    record = next((h for h in history if h["attack_id"] == atk_id), None)
    assert record is not None
    assert record["attack_type"] == "fdia_power"
    assert record["target_component"] == "Bus_2"
    assert record["status"] == "ACTIVE"
    assert "scenario" in record
    assert "started_at" in record

    # 3. Query single attack details
    detail_resp = client.get(f"/api/v1/attacks/{atk_id}")
    assert detail_resp.status_code == 200
    assert detail_resp.json()["attack_id"] == atk_id

    # 4. Stop attack
    stop_resp = client.post(f"/api/v1/attacks/{atk_id}/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["status"] == "STOPPED"

    # 5. Check history shows STOPPED
    history_after = client.get("/api/v1/attacks/history").json()
    rec_after = next(h for h in history_after if h["attack_id"] == atk_id)
    assert rec_after["status"] == "STOPPED"

    # 6. Stop non-existent attack returns 404
    err_stop = client.post("/api/v1/attacks/non_existent_atk_999/stop")
    assert err_stop.status_code == 404

    # 7. Launch with invalid bus returns 400
    err_launch = client.post(
        "/api/v1/attacks/launch",
        json={
            "attack_type": "fdia_voltage",
            "target_bus_id": 999,
            "duration_seconds": 60,
        },
    )
    assert err_launch.status_code == 400
