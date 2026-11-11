"""Pydantic schemas for grid telemetry streams and measurements."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class BusTelemetry(BaseModel):
    """Telemetry packet for an individual bus PMU / SCADA meter."""
    bus_id: int
    name: str
    vm_pu: float = Field(..., description="Measured voltage magnitude (p.u.)")
    va_degree: float = Field(..., description="Measured voltage phase angle (deg)")
    p_mw: float = Field(..., description="Active power injection (MW)")
    q_mvar: float = Field(..., description="Reactive power injection (MVAr)")
    is_spoofed: bool = Field(False, description="True if telemetry measurement has been tampered")


class LineTelemetry(BaseModel):
    """Telemetry packet for a branch line meter."""
    line_id: int
    name: str
    from_bus: int
    to_bus: int
    loading_percent: float = Field(..., description="Thermal loading percentage")
    p_from_mw: float
    q_from_mvar: float
    pl_mw: float
    is_spoofed: bool = Field(False, description="True if line telemetry has been tampered")


class TelemetryPacket(BaseModel):
    """Unified telemetry broadcast packet emitted by substation RTU / PMU network."""
    sequence_id: int
    timestamp: str
    topology_name: str
    buses: List[BusTelemetry]
    lines: List[LineTelemetry]
    compromised_buses_count: int = 0
    active_attack_vectors: List[str] = Field(default_factory=list)

