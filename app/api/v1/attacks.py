"""Cyber Attack Simulation REST API endpoints.
Confined strictly to local virtual simulation; never connects to physical grid equipment.
"""

from datetime import datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_attack_engine, get_db, get_telemetry_collector
from app.attack_simulation.engine import AttackEngine
from app.telemetry.collector import TelemetryCollector
from app.attack_simulation.schemas import (
    AttackLaunchRequest,
    ActiveAttackInfo,
    AttackStopResponse,
)
from app.core.exceptions import AttackExecutionError
from app.core.logging import logger
from app.database.models import AttackScenarioRecord
from app.telemetry.stream import alert_stream_manager

router = APIRouter(prefix="/attacks", tags=["Attack Simulation"])


@router.get("/scenarios")
def list_predefined_scenarios():
    """Lists predefined cyber-physical attack scenarios available for demonstration and evaluation."""
    return [
        {
            "id": "fdia_voltage_der",
            "name": "FDIA Voltage Tampering (Renewable Bus)",
            "attack_type": "fdia_voltage",
            "target_bus_id": 2,
            "target_name": "Bus 2 - Renewable DER",
            "default_intensity": 1.15,
            "default_duration_seconds": 120,
            "description": "Biases voltage sensor telemetry by +15% on Bus 2 to mask local physical voltage drop.",
            "physical_impact": "State Estimation residual J(x) divergence; deceived Volt-VAR inverter controllers.",
            "severity": "CRITICAL",
        },
        {
            "id": "fdia_power_industrial",
            "name": "FDIA Active Power Spoofing (Industrial Hub)",
            "attack_type": "fdia_power",
            "target_bus_id": 5,
            "target_name": "Bus 5 - Industrial Park",
            "default_intensity": 2.2,
            "default_duration_seconds": 90,
            "description": "Injects false active/reactive power measurements at Bus 5 to trigger false load shedding.",
            "physical_impact": "Kirchhoff Current Law (KCL) conservation residual violation on adjacent feeder lines.",
            "severity": "HIGH",
        },
        {
            "id": "dos_freeze_switchgear",
            "name": "Telemetry DoS Freeze (Main Incomer)",
            "attack_type": "dos_freeze",
            "target_bus_id": 1,
            "target_name": "Bus 1 - Main Incomer Switchgear",
            "default_intensity": 1.0,
            "default_duration_seconds": 60,
            "description": "Simulates RTU communication freeze; transmits static measurements while physical state varies.",
            "physical_impact": "Loss of dynamic situational awareness; delayed breaker response to downstream faults.",
            "severity": "HIGH",
        },
        {
            "id": "replay_commercial",
            "name": "Sensor Replay Attack (Commercial District)",
            "attack_type": "replay_attack",
            "target_bus_id": 6,
            "target_name": "Bus 6 - Commercial District",
            "default_intensity": 1.0,
            "default_duration_seconds": 75,
            "description": "Replays 30-second stale nominal measurement buffer to mask progressive physical degradation.",
            "physical_impact": "Zero-variance pattern over moving window despite renewable generation changes.",
            "severity": "MEDIUM",
        },
        {
            "id": "load_tampering_surge",
            "name": "Coordinated Demand Tampering (Heavy Industrial)",
            "attack_type": "load_tampering",
            "target_bus_id": 5,
            "target_name": "Bus 5 - Industrial Park",
            "default_intensity": 1.6,
            "default_duration_seconds": 90,
            "description": "Physically tampers with industrial demand, spiking active load +60% in Pandapower calculation.",
            "physical_impact": "Feeder line thermal overload (>100%), bus voltage drop (<0.95 p.u.), frequency dip.",
            "severity": "CRITICAL",
        },
        {
            "id": "der_disconnect_solar",
            "name": "Unauthorized DER Trip (Solar PV Array)",
            "attack_type": "der_disconnect",
            "target_bus_id": 2,
            "target_name": "Bus 2 - Solar PV Array",
            "default_intensity": 1.0,
            "default_duration_seconds": 120,
            "description": "Sends unauthorized breaker open command disconnecting 1.5 MW Solar PV generation.",
            "physical_impact": "Instantaneous power deficit; increased import from substation slack bus; frequency dip.",
            "severity": "CRITICAL",
        },
    ]


@router.get("/active", response_model=List[ActiveAttackInfo])
def list_active_attacks(engine: AttackEngine = Depends(get_attack_engine)):
    """Lists all currently active virtual attacks running in local simulation."""
    return engine.get_active_attacks()


@router.get("/history", response_model=List[ActiveAttackInfo])
def get_attack_history(
    limit: int = Query(50, ge=1, le=500),
    attack_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """
    Retrieves the complete history of simulated attack scenarios.
    Returns baseline values, injected values, timestamps, target components, and scenarios.
    """
    query = db.query(AttackScenarioRecord).order_by(AttackScenarioRecord.id.desc())
    if attack_type:
        query = query.filter(AttackScenarioRecord.attack_type == attack_type)
    if status_filter:
        query = query.filter(AttackScenarioRecord.status == status_filter.upper())
    records = query.limit(limit).all()

    results: List[ActiveAttackInfo] = []
    for r in records:
        params = {}
        if r.parameters_json:
            try:
                params = json.loads(r.parameters_json)
            except Exception:
                params = {}

        elapsed = 0.0
        if r.started_at:
            end_t = r.stopped_at or datetime.now(timezone.utc)
            s_t = r.started_at.replace(tzinfo=timezone.utc) if r.started_at.tzinfo is None else r.started_at
            e_t = end_t.replace(tzinfo=timezone.utc) if end_t.tzinfo is None else end_t
            elapsed = max(0.0, (e_t - s_t).total_seconds())

        results.append(
            ActiveAttackInfo(
                attack_id=r.scenario_uuid,
                attack_type=r.attack_type,
                scenario=params.get("scenario") or r.name,
                target_component=r.target,
                target_bus_id=params.get("target_bus_id"),
                target_line_id=params.get("target_line_id"),
                intensity=r.intensity,
                magnitude=params.get("magnitude", r.intensity),
                duration_seconds=r.duration_seconds,
                elapsed_seconds=round(elapsed, 1),
                started_at=r.started_at.isoformat() if r.started_at else datetime.now(timezone.utc).isoformat(),
                stopped_at=r.stopped_at.isoformat() if r.stopped_at else None,
                status=r.status,
                is_confined_locally=True,
                baseline_values=params.get("baseline_values", {}),
                injected_values=params.get("injected_values", {}),
            )
        )
    return results


@router.get("/{attack_id}", response_model=ActiveAttackInfo)
def get_attack_details(
    attack_id: str,
    engine: AttackEngine = Depends(get_attack_engine),
    db: Session = Depends(get_db),
):
    """Retrieves details of a specific attack scenario by attack_id."""
    info = engine.get_attack_info(attack_id)
    if info:
        return info

    rec = db.query(AttackScenarioRecord).filter(AttackScenarioRecord.scenario_uuid == attack_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack scenario with ID '{attack_id}' not found.",
        )

    params = {}
    if rec.parameters_json:
        try:
            params = json.loads(rec.parameters_json)
        except Exception:
            params = {}

    return ActiveAttackInfo(
        attack_id=rec.scenario_uuid,
        attack_type=rec.attack_type,
        scenario=params.get("scenario") or rec.name,
        target_component=rec.target,
        target_bus_id=params.get("target_bus_id"),
        target_line_id=params.get("target_line_id"),
        intensity=rec.intensity,
        magnitude=params.get("magnitude", rec.intensity),
        duration_seconds=rec.duration_seconds,
        elapsed_seconds=0.0,
        started_at=rec.started_at.isoformat() if rec.started_at else datetime.now(timezone.utc).isoformat(),
        stopped_at=rec.stopped_at.isoformat() if rec.stopped_at else None,
        status=rec.status,
        is_confined_locally=True,
        baseline_values=params.get("baseline_values", {}),
        injected_values=params.get("injected_values", {}),
    )


@router.post("/launch", response_model=ActiveAttackInfo, status_code=status.HTTP_201_CREATED)
async def launch_virtual_attack(
    req: AttackLaunchRequest,
    engine: AttackEngine = Depends(get_attack_engine),
    collector: TelemetryCollector = Depends(get_telemetry_collector),
    db: Session = Depends(get_db),
):
    """
    Initiates a cyber-physical attack vector safely confined to local software simulation.
    Supported vectors:
    - fdia / fdia_voltage: False data injection targeting bus voltage telemetry
    - fdia_power: False data injection targeting power injection telemetry
    - replay_attack: Replaying historical telemetry readings to mask real state
    - load_manipulation / load_tampering: Controlled demand change in physical Pandapower simulation
    - dos_freeze: Denial of Service communication freeze
    - der_disconnect: Malicious trip command targeting distributed generation
    """
    try:
        attack_info = engine.launch_attack(req)
        collector.sample_telemetry()
    except AttackExecutionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Record scenario with baseline and injected parameters in SQLite
    params = {
        "scenario": attack_info.scenario,
        "baseline_values": attack_info.baseline_values,
        "injected_values": attack_info.injected_values,
        "magnitude": attack_info.magnitude,
        "target_bus_id": req.target_bus_id,
        "target_line_id": req.target_line_id,
    }
    rec = AttackScenarioRecord(
        scenario_uuid=attack_info.attack_id,
        name=attack_info.scenario or f"Simulated {req.attack_type.value}",
        attack_type=req.attack_type.value,
        target=attack_info.target_component,
        intensity=req.intensity,
        duration_seconds=req.duration_seconds,
        status="ACTIVE",
        parameters_json=json.dumps(params),
    )
    db.add(rec)
    db.commit()

    # Broadcast attack-state update to connected WebSocket clients
    try:
        await alert_stream_manager.broadcast_json({
            "type": "ATTACK_STATE_UPDATE",
            "event": "LAUNCHED",
            "attack": attack_info.model_dump(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as ws_err:
        logger.debug(f"[WebSocket] Broadcast failed: {ws_err}")

    return attack_info


@router.post("/{attack_id}/stop", response_model=AttackStopResponse)
async def stop_virtual_attack(
    attack_id: str,
    engine: AttackEngine = Depends(get_attack_engine),
    collector: TelemetryCollector = Depends(get_telemetry_collector),
    db: Session = Depends(get_db),
):
    """Terminates an active virtual attack and restores affected grid setpoints."""
    success = engine.stop_attack(attack_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active attack with ID '{attack_id}' not found.",
        )
    collector.sample_telemetry()

    # Update database record
    rec = db.query(AttackScenarioRecord).filter(AttackScenarioRecord.scenario_uuid == attack_id).first()
    if rec:
        rec.status = "STOPPED"
        rec.stopped_at = datetime.now(timezone.utc)
        db.commit()

    # Broadcast attack stop event to WebSockets
    try:
        await alert_stream_manager.broadcast_json({
            "type": "ATTACK_STATE_UPDATE",
            "event": "STOPPED",
            "attack_id": attack_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as ws_err:
        logger.debug(f"[WebSocket] Broadcast stop failed: {ws_err}")

    return AttackStopResponse(
        attack_id=attack_id,
        status="STOPPED",
        message=f"Attack '{attack_id}' has been neutralized and grid parameters restored.",
    )


@router.post("/stop-all", status_code=status.HTTP_200_OK)
async def stop_all_virtual_attacks(
    engine: AttackEngine = Depends(get_attack_engine),
    collector: TelemetryCollector = Depends(get_telemetry_collector),
    db: Session = Depends(get_db),
):
    """Terminates all active simulated attacks and restores nominal grid operation."""
    count = engine.stop_all_attacks()
    collector.sample_telemetry()

    # Update any active records in database
    db.query(AttackScenarioRecord).filter(AttackScenarioRecord.status == "ACTIVE").update({
        "status": "STOPPED",
        "stopped_at": datetime.now(timezone.utc),
    })
    db.commit()

    # Broadcast update via WebSocket
    try:
        await alert_stream_manager.broadcast_json({
            "type": "ATTACK_STATE_UPDATE",
            "event": "STOPPED_ALL",
            "count": count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as ws_err:
        logger.debug(f"[WebSocket] Broadcast stop-all failed: {ws_err}")

    return {
        "status": "success",
        "terminated_count": count,
        "message": f"Successfully stopped {count} active virtual attack scenarios.",
    }
