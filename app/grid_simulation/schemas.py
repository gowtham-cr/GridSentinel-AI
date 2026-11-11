"""Pydantic schemas for grid simulation components and power flow results."""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class BusState(BaseModel):
    """Physical state of an electrical bus."""
    bus_id: int
    name: str
    vn_kv: float
    vm_pu: float = Field(..., description="Voltage magnitude in per-unit (nominal = 1.0)")
    va_degree: float = Field(..., description="Voltage angle in degrees")
    p_mw: float = Field(..., description="Net active power injection in MW")
    q_mvar: float = Field(..., description="Net reactive power injection in MVAr")
    voltage_violation: bool = Field(False, description="True if V < 0.95 or V > 1.05 p.u.")


class LineState(BaseModel):
    """Physical state of an electrical transmission or distribution line."""
    line_id: int
    name: str
    from_bus: int
    to_bus: int
    p_from_mw: float
    q_from_mvar: float
    p_to_mw: float
    q_to_mvar: float
    pl_mw: float = Field(..., description="Active power line loss in MW")
    loading_percent: float = Field(..., description="Thermal loading percentage")
    thermal_overload: bool = Field(False, description="True if loading > 100%")


class ComponentSummary(BaseModel):
    """Summary of electrical components connected to the grid."""
    id: int
    name: str
    bus: int
    type: str
    p_mw: float
    q_mvar: Optional[float] = 0.0
    in_service: bool = True


class GridStateSummary(BaseModel):
    """Comprehensive snapshot of grid physics and power flow convergence."""
    timestamp: str
    topology_name: str
    converged: bool
    algorithm: str
    total_generation_mw: float
    total_load_mw: float
    total_losses_mw: float
    active_power_imbalance_mw: float
    min_voltage_pu: float
    max_voltage_pu: float
    max_line_loading_pct: float
    voltage_violations_count: int
    overloaded_lines_count: int
    buses: List[BusState]
    lines: List[LineState]


class TopologyInfo(BaseModel):
    """Metadata regarding an electrical topology."""
    name: str
    description: str
    num_buses: int
    num_lines: int
    num_loads: int
    num_generators: int
    nominal_voltage_kv: float
    total_installed_capacity_mw: float

