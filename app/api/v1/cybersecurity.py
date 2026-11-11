"""Cybersecurity AI Detection and Mitigation REST API endpoints."""

import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import (
    get_cybersecurity_detector,
    get_telemetry_collector,
    get_grid_simulator,
    get_mitigation_engine,
    get_db,
)
from app.cybersecurity.detector import GridCybersecurityDetector
from app.cybersecurity.mitigation import (
    MitigationEngine,
    MitigationPlan,
    MitigationResult,
    StateComparisonReport,
)
from app.cybersecurity.schemas import (
    DetectionResult,
    SecurityIncidentReport,
    ModelMetrics,
    ResidualAnalysisResult,
)
from app.cybersecurity.dataset_classifier import train_multiclass_pipeline
from app.telemetry.collector import TelemetryCollector
from app.grid_simulation.simulator import GridSimulator
from app.database.models import (
    SecurityIncident,
    AttackScenarioRecord,
    TelemetryLog,
    SimulationRunRecord,
)
from app.telemetry.stream import alert_stream_manager

router = APIRouter(prefix="/security", tags=["Cybersecurity Detection & Mitigation"])


@router.get("/metrics", response_model=Optional[ModelMetrics])
def get_ai_model_metrics(detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector)):
    """
    Returns authentic, evaluated Scikit-learn model performance metrics.
    Metrics reflect genuine test split evaluation (test accuracy, F1 score).
    """
    metrics = detector.metrics
    if not metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metrics not available. Train the baseline model first.",
        )
    return metrics


@router.get("/multiclass-metrics", response_model=Dict[str, Any])
def get_multiclass_model_metrics(detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector)):
    """
    Returns authentic, evaluated Scikit-learn Multiclass (31-Class) model performance metrics
    trained on the Mendeley IEEE 14-bus dataset with 5-row embargo gap.
    Reports balanced accuracy, macro precision, recall, macro F1, binary metrics,
    per-class metrics, confusion matrix, and complete official taxonomy.
    """
    metrics = detector.get_multiclass_metrics()
    if not metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Multiclass model metrics not available. Ensure dataset is available and trained.",
        )
    return metrics


@router.get("/residual-analysis", response_model=ResidualAnalysisResult)
def get_residual_analysis(
    detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector),
    collector: TelemetryCollector = Depends(get_telemetry_collector),
    simulator: GridSimulator = Depends(get_grid_simulator),
):
    """
    Returns real-time Kirchhoff active power nodal residual calculations for every bus
    in the active microgrid/transmission network, identifying the worst mismatch node.
    """
    packet = collector.sample_telemetry()
    grid_state = simulator.get_state_summary()
    return detector.get_residual_analysis(packet, grid_state)


@router.post("/models/train-multiclass", response_model=Dict[str, Any])
def train_multiclass_model(
    nrows: int = Query(30000, ge=5000, le=100000, description="Number of dataset rows to use"),
    embargo: int = Query(5, ge=1, le=20, description="Embargo rows to discard between chronological splits"),
    detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector),
):
    """
    Triggers chronological embargo training of the 31-class Random Forest model
    on the IEEE 14-bus cyber-physical dataset.
    """
    metrics = train_multiclass_pipeline(
        nrows=nrows,
        embargo_rows=embargo,
        save_artifacts=True,
    )
    # Refresh detector's classifier
    detector.dataset_classifier._initialize()
    return metrics


@router.post("/detect")
async def run_detection(
    detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector),
    collector: TelemetryCollector = Depends(get_telemetry_collector),
    simulator: GridSimulator = Depends(get_grid_simulator),
    mitigation_engine: MitigationEngine = Depends(get_mitigation_engine),
    db: Session = Depends(get_db),
):
    """
    Executes AI inference and Kirchhoff power conservation validation on current telemetry.
    Returns anomaly status, classification, confidence, and creates an incident record if anomalous.
    """
    packet = collector.sample_telemetry()
    grid_state = simulator.get_state_summary()

    result, incident = detector.detect(packet=packet, grid_state=grid_state)

    if result.is_anomaly or incident:
        mitigation_engine.record_attacked_snapshot()

    if incident:
        # Save incident to SQLite
        incident_db = SecurityIncident(
            incident_uuid=incident.incident_id,
            attack_type=incident.attack_type,
            severity=incident.severity.value,
            target_component=incident.target_component,
            anomaly_score=incident.anomaly_score,
            confidence=incident.confidence,
            voltage_violation=incident.voltage_violation,
            thermal_overload=incident.thermal_overload,
            power_imbalance_violation=incident.power_imbalance_violation,
            details_json=json.dumps(incident.details),
            resolved=False,
        )
        db.add(incident_db)
        db.commit()

        # Broadcast live alert to connected WebSocket clients
        await alert_stream_manager.broadcast_json(incident.model_dump())

    return {
        "detection": result,
        "incident": incident,
    }


@router.get("/recommend-mitigation", response_model=MitigationPlan)
def recommend_mitigation(
    attack_type: Optional[str] = Query(None, description="Specific attack type to mitigate"),
    target_component: Optional[str] = Query(None, description="Affected electrical node/component"),
    mitigation_engine: MitigationEngine = Depends(get_mitigation_engine),
):
    """
    Generates tailored, physics-aware engineering mitigation countermeasure for detected threats.
    """
    return mitigation_engine.recommend_mitigation(
        attack_type=attack_type,
        target_component=target_component,
    )


@router.post("/mitigate", response_model=MitigationResult)
async def execute_mitigation(
    mitigation_engine: MitigationEngine = Depends(get_mitigation_engine),
    db: Session = Depends(get_db),
):
    """
    Applies simulated cyber-physical remediation:
    1. Neutralizes active attack perturbations.
    2. Restores nominal setpoints and sanitizes telemetry.
    3. Recalculates genuine AC Newton-Raphson power flow.
    4. Evaluates state recovery and updates comparison matrix.
    """
    result = mitigation_engine.apply_mitigation()

    # Mark active incidents as resolved in SQLite
    unresolved = db.query(SecurityIncident).filter(SecurityIncident.resolved == False).all()
    for inc in unresolved:
        inc.resolved = True
        inc.resolution_notes = f"Remediated via automated mitigation: {result.strategy_executed}"
    
    # Mark active attack scenarios as STOPPED
    db.query(AttackScenarioRecord).filter(AttackScenarioRecord.status == "ACTIVE").update({"status": "STOPPED"})

    # Record mitigation run in SQLite
    post = result.post_mitigation_metrics
    mit_run = SimulationRunRecord(
        run_uuid=f"MIT-{uuid.uuid4().hex[:8].upper()}",
        topology_name=mitigation_engine.simulator.topology_name,
        action="MITIGATE",
        step_count=0,
        speed_hz=1.0,
        converged=post.converged,
        total_p_gen_mw=post.total_generation_mw,
        total_p_load_mw=post.total_load_mw,
        min_vm_pu=post.min_voltage_pu,
        max_vm_pu=post.max_voltage_pu,
        voltage_violations=post.voltage_violations_count,
        overloaded_lines=post.overloaded_lines_count,
        notes=f"Applied mitigation '{result.strategy_executed}'. Effective: {result.recovery_effective}",
    )
    db.add(mit_run)

    # Record genuine physical recovery verification in SQLite
    if result.recovery_effective:
        rec_run = SimulationRunRecord(
            run_uuid=f"REC-{uuid.uuid4().hex[:8].upper()}",
            topology_name=mitigation_engine.simulator.topology_name,
            action="RECOVERY",
            step_count=0,
            speed_hz=1.0,
            converged=post.converged,
            total_p_gen_mw=post.total_generation_mw,
            total_p_load_mw=post.total_load_mw,
            min_vm_pu=post.min_voltage_pu,
            max_vm_pu=post.max_voltage_pu,
            voltage_violations=post.voltage_violations_count,
            overloaded_lines=post.overloaded_lines_count,
            notes=f"Physical grid recovery verified: AC power flow converged. Voltages [{post.min_voltage_pu:.4f}, {post.max_voltage_pu:.4f}] pu within limits.",
        )
        db.add(rec_run)

    db.commit()

    # Broadcast live alert/state update to connected WebSocket clients
    try:
        await alert_stream_manager.broadcast_json({
            "type": "LIFECYCLE_UPDATE",
            "action": "MITIGATE_AND_RECOVER",
            "recovery_effective": result.recovery_effective,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass

    return result


@router.get("/state-comparison", response_model=StateComparisonReport)
def get_state_comparison(mitigation_engine: MitigationEngine = Depends(get_mitigation_engine)):
    """
    Returns 3-way comparative metrics between Normal Baseline, Attacked, and Recovered states.
    """
    return mitigation_engine.get_comparison_report()


@router.get("/event-history", response_model=List[Dict[str, Any]])
def get_event_history(
    limit: int = Query(100, ge=5, le=2000),
    db: Session = Depends(get_db),
):
    """
    Retrieves complete chronological cybersecurity and electrical event history.
    Combines attack launches, detections, mitigations, and physical violations.
    """
    events: List[Dict[str, Any]] = []

    # 1. Incidents from database
    incidents = db.query(SecurityIncident).order_by(SecurityIncident.timestamp.desc()).limit(limit).all()
    for inc in incidents:
        events.append({
            "id": f"EVT-INC-{inc.id}",
            "type": "DETECTION_INCIDENT",
            "timestamp": inc.timestamp.isoformat(),
            "title": f"Threat Detected: {inc.attack_type}",
            "severity": inc.severity,
            "target": inc.target_component,
            "details": f"Anomaly score {inc.anomaly_score:.2f} (Confidence: {inc.confidence*100:.0f}%). Voltage violation: {inc.voltage_violation}, Overload: {inc.thermal_overload}",
            "status": "RESOLVED" if inc.resolved else "ACTIVE_ALERT",
        })

    # 2. Attack scenarios from database
    attacks = db.query(AttackScenarioRecord).order_by(AttackScenarioRecord.started_at.desc()).limit(limit).all()
    for atk in attacks:
        events.append({
            "id": f"EVT-ATK-{atk.id}",
            "type": "ATTACK_INJECTION",
            "timestamp": atk.started_at.isoformat(),
            "title": f"Attack Vector Launched: {atk.name}",
            "severity": "CRITICAL" if atk.intensity >= 1.5 else "HIGH",
            "target": atk.target,
            "details": f"Injected locally with intensity {atk.intensity:.1f}x for {atk.duration_seconds}s. Zero physical hardware connection.",
            "status": atk.status,
        })

    # 3. Simulation runs & lifecycles from database
    runs = db.query(SimulationRunRecord).order_by(SimulationRunRecord.timestamp.desc()).limit(limit).all()
    for r in runs:
        evt_type = (
            "INITIALIZE" if r.action == "INITIALIZE"
            else "RECOVERY" if r.action == "RECOVERY"
            else "MITIGATION_APPLIED" if r.action == "MITIGATE"
            else "ESTIMATION_EVALUATED" if r.action == "ESTIMATION"
            else "SIMULATION_STEP"
        )
        title = (
            f"Simulation Initialized: {r.topology_name}" if r.action == "INITIALIZE"
            else f"Grid Recovery Verified: {r.topology_name}" if r.action == "RECOVERY"
            else f"Autonomous Mitigation: {r.topology_name}" if r.action == "MITIGATE"
            else f"WLS Estimation Evaluated: {r.topology_name}" if r.action == "ESTIMATION"
            else f"Simulation Lifecycle: {r.action} ({r.topology_name})"
        )
        target = (
            r.topology_name if r.action in ("INITIALIZE", "RECOVERY")
            else f"{r.topology_name} (Step {r.step_count})"
        )
        events.append({
            "id": f"EVT-RUN-{r.id}",
            "type": evt_type,
            "timestamp": r.timestamp.isoformat(),
            "title": title,
            "severity": "INFO",
            "target": target,
            "details": r.notes or f"Simulation action {r.action} executed with AC Newton-Raphson power flow.",
            "status": "COMPLETED",
        })

    # Sort combined events by timestamp descending
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events[:limit]


@router.post("/models/train", response_model=ModelMetrics)
def retrain_detection_models(
    samples: int = Query(240, ge=60, le=1000, description="Number of simulation samples to generate"),
    detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector),
):
    """
    Retrains the Scikit-learn AI/ML detection pipeline using pandapower power flow simulations.
    Evaluates on held-out test data and saves new model weights.
    """
    return detector.train_baseline(num_samples=samples)


@router.get("/incidents", response_model=List[dict])
def list_incidents(
    unresolved_only: bool = Query(False, description="Filter for unresolved incidents only"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Retrieves security incidents logged in the database."""
    query = db.query(SecurityIncident).order_by(SecurityIncident.timestamp.desc())
    if unresolved_only:
        query = query.filter(SecurityIncident.resolved == False)
    
    incidents = query.limit(limit).all()
    results = []
    for inc in incidents:
        results.append({
            "incident_id": inc.incident_uuid,
            "timestamp": inc.timestamp.isoformat(),
            "attack_type": inc.attack_type,
            "severity": inc.severity,
            "target_component": inc.target_component,
            "anomaly_score": inc.anomaly_score,
            "confidence": inc.confidence,
            "voltage_violation": inc.voltage_violation,
            "thermal_overload": inc.thermal_overload,
            "power_imbalance_violation": inc.power_imbalance_violation,
            "resolved": inc.resolved,
            "resolution_notes": inc.resolution_notes,
            "details": json.loads(inc.details_json) if inc.details_json else {},
        })
    return results


@router.post("/incidents/{incident_id}/resolve")
def resolve_incident(
    incident_id: str,
    notes: Optional[str] = Query(None, description="Resolution notes from cybersecurity operator"),
    db: Session = Depends(get_db),
):
    """Marks a detected security incident as resolved."""
    inc = db.query(SecurityIncident).filter(SecurityIncident.incident_uuid == incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident '{incident_id}' not found.")
    
    inc.resolved = True
    inc.resolution_notes = notes or "Resolved by operator"
    db.commit()

    return {
        "status": "success",
        "incident_id": incident_id,
        "resolved": True,
        "message": f"Incident '{incident_id}' marked as resolved.",
    }
