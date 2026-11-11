"""Pydantic schemas for simulated cybersecurity attack vectors."""

from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class AttackType(str, Enum):
    """Categorization of smart grid cyber-physical attack vectors."""
    FDIA = "fdia"
    FDIA_VOLTAGE = "fdia_voltage"
    FDIA_POWER = "fdia_power"
    DOS_FREEZE = "dos_freeze"
    REPLAY_ATTACK = "replay_attack"
    LOAD_TAMPERING = "load_tampering"
    LOAD_MANIPULATION = "load_manipulation"
    DER_DISCONNECT = "der_disconnect"


class AttackLaunchRequest(BaseModel):
    """Parameters to initiate an attack scenario within the local virtual environment."""
    attack_type: AttackType = Field(..., description="Type of cyber-physical attack vector")
    target_bus_id: Optional[int] = Field(None, description="Target electrical bus ID (0-based)")
    target_line_id: Optional[int] = Field(None, description="Target transmission line ID")
    intensity: float = Field(1.0, ge=0.01, le=10.0, description="Attack scaling factor / magnitude")
    magnitude: Optional[float] = Field(None, description="Configurable attack magnitude / offset value")
    parameter: Optional[str] = Field("voltage", description="Target parameter for FDIA ('voltage' or 'power')")
    duration_seconds: int = Field(60, ge=1, le=3600, description="Simulation duration in seconds")
    description: Optional[str] = Field(None, description="Optional notes on attack scenario")


class ActiveAttackInfo(BaseModel):
    """Status details of an active virtual attack."""
    attack_id: str
    attack_type: str
    scenario: Optional[str] = None
    target_component: str
    target_bus_id: Optional[int] = None
    target_line_id: Optional[int] = None
    intensity: float = 1.0
    magnitude: Optional[float] = None
    duration_seconds: int = 60
    elapsed_seconds: float = 0.0
    started_at: str
    stopped_at: Optional[str] = None
    status: str  # ACTIVE, EXPIRED, STOPPED
    is_confined_locally: bool = True
    baseline_values: Dict[str, Any] = Field(default_factory=dict)
    injected_values: Dict[str, Any] = Field(default_factory=dict)


class AttackStopResponse(BaseModel):
    """Response when terminating an active attack."""
    attack_id: str
    status: str
    message: str

