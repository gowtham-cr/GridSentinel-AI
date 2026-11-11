"""SQLAlchemy ORM models for telemetry logs, security incidents, attacks, and grid snapshots."""

from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Boolean,
    DateTime,
    Text,
)
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class TelemetryLog(Base):
    """Stores high-resolution sensor telemetry sampled from the electrical microgrid."""

    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True, nullable=False)
    bus_id = Column(Integer, index=True, nullable=True)
    line_id = Column(Integer, index=True, nullable=True)
    
    # Bus physical measurements
    vm_pu = Column(Float, nullable=True)          # Voltage magnitude (per unit)
    va_degree = Column(Float, nullable=True)      # Voltage angle (degrees)
    p_mw = Column(Float, nullable=True)           # Active power (MW)
    q_mvar = Column(Float, nullable=True)         # Reactive power (MVAr)
    
    # Line physical measurements
    line_loading_pct = Column(Float, nullable=True)  # Line loading (%)
    p_from_mw = Column(Float, nullable=True)
    q_from_mvar = Column(Float, nullable=True)

    # Security telemetry attributes
    is_anomaly = Column(Boolean, default=False, index=True)
    anomaly_score = Column(Float, default=0.0)
    is_compromised = Column(Boolean, default=False, index=True)
    attack_tag = Column(String(50), nullable=True)


class SecurityIncident(Base):
    """Records detected cybersecurity anomalies and cyber-physical security incidents."""

    __tablename__ = "security_incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_uuid = Column(String(64), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=utc_now, index=True, nullable=False)
    attack_type = Column(String(50), index=True, nullable=False)  # FDIA, DoS, Replay, Load_Tampering, etc.
    severity = Column(String(20), default="MEDIUM")               # LOW, MEDIUM, HIGH, CRITICAL
    target_component = Column(String(100), nullable=False)        # e.g., Bus_4, Line_2-3, Inverter_1
    anomaly_score = Column(Float, nullable=False)
    confidence = Column(Float, default=0.0)
    
    # Physics violation indicators
    voltage_violation = Column(Boolean, default=False)
    thermal_overload = Column(Boolean, default=False)
    power_imbalance_violation = Column(Boolean, default=False)
    
    details_json = Column(Text, nullable=True)
    resolved = Column(Boolean, default=False, index=True)
    resolution_notes = Column(Text, nullable=True)


class AttackScenarioRecord(Base):
    """Tracks historical and active simulated attack scenarios in local virtual environment."""

    __tablename__ = "attack_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario_uuid = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    attack_type = Column(String(50), index=True, nullable=False)
    target = Column(String(100), nullable=False)
    intensity = Column(Float, default=1.0)
    duration_seconds = Column(Integer, default=60)
    status = Column(String(20), default="PENDING")  # PENDING, ACTIVE, COMPLETED, STOPPED
    started_at = Column(DateTime, default=utc_now)
    stopped_at = Column(DateTime, nullable=True)
    parameters_json = Column(Text, nullable=True)


class GridSnapshotRecord(Base):
    """Stores periodic power flow state snapshots for audit and post-incident forensic analysis."""

    __tablename__ = "grid_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    topology_name = Column(String(50), nullable=False)
    total_p_gen_mw = Column(Float, nullable=False)
    total_p_load_mw = Column(Float, nullable=False)
    total_losses_mw = Column(Float, nullable=False)
    power_imbalance_mw = Column(Float, nullable=False)
    min_vm_pu = Column(Float, nullable=False)
    max_vm_pu = Column(Float, nullable=False)
    max_line_loading_pct = Column(Float, nullable=False)
    converged = Column(Boolean, default=True)


class SimulationRunRecord(Base):
    """Tracks virtual grid simulation executions and control lifecycles."""

    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_uuid = Column(String(64), unique=True, index=True, nullable=False)
    topology_name = Column(String(50), nullable=False)
    action = Column(String(30), nullable=False)  # INITIALIZE, START, PAUSE, RESUME, RESET, STEP, MITIGATE
    step_count = Column(Integer, default=0)
    speed_hz = Column(Float, default=1.0)
    converged = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    total_p_gen_mw = Column(Float, nullable=True)
    total_p_load_mw = Column(Float, nullable=True)
    min_vm_pu = Column(Float, nullable=True)
    max_vm_pu = Column(Float, nullable=True)
    voltage_violations = Column(Integer, default=0)
    overloaded_lines = Column(Integer, default=0)
    notes = Column(Text, nullable=True)


