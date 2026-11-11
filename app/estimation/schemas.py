"""
Pydantic schemas for Power System State Estimation and Bad Data Identification.
Strictly virtual simulation models; clearly distinguishes simulated software PMU-style
telemetry from physical PMU hardware.
"""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class MeasurementChannelType(str, Enum):
    VOLTAGE_MAGNITUDE = "v"
    VOLTAGE_ANGLE = "va"
    ACTIVE_POWER_INJECTION = "p"
    REACTIVE_POWER_INJECTION = "q"
    ACTIVE_POWER_FLOW = "p_line"
    REACTIVE_POWER_FLOW = "q_line"


class MeasurementChannel(BaseModel):
    """Telemetry channel representing a simulated substation sensor or PMU channel."""
    channel_id: int
    name: str
    meas_type: str = Field(..., description="'v', 'va', 'p', or 'q'")
    element_type: str = Field(..., description="'bus', 'line', or 'trafo'")
    element_id: int
    side: Optional[str] = Field(None, description="'from', 'to', 'hv', 'lv', or None")
    measured_value: float = Field(..., description="Measured sensor reading (simulated software telemetry)")
    estimated_value: Optional[float] = Field(None, description="WLS state estimator computed value")
    std_dev: float = Field(..., description="Assumed sensor measurement standard deviation")
    raw_residual: Optional[float] = Field(None, description="Raw residual: (measured - estimated)")
    normalized_residual: Optional[float] = Field(None, description="Normalized residual: |residual| / std_dev")
    is_bad_data: bool = Field(False, description="True if normalized residual exceeds bad data threshold")
    is_missing: bool = Field(False, description="True if channel experienced simulated packet dropout")
    is_simulated: bool = Field(True, description="Strictly True: synthetic software telemetry")
    sensor_source: str = Field(
        "SIMULATED_SOFTWARE_METER",
        description="Sensor provenance disclaimer confirming zero physical hardware connection",
    )


class BusStateEstimate(BaseModel):
    """Bus-level state estimation comparison against simulator ground truth."""
    bus_id: int
    name: str
    estimated_vm_pu: float = Field(..., description="WLS estimated voltage magnitude (p.u.)")
    ground_truth_vm_pu: float = Field(..., description="Pandapower calculated ground truth voltage magnitude (p.u.)")
    vm_error_pu: float = Field(..., description="Absolute voltage magnitude error |est - ground_truth|")
    estimated_va_degree: float = Field(..., description="WLS estimated voltage phase angle (deg)")
    ground_truth_va_degree: float = Field(..., description="Pandapower calculated ground truth voltage angle (deg)")
    va_error_degree: float = Field(..., description="Absolute voltage angle error (deg)")


class BranchFlowEstimate(BaseModel):
    """Branch power flow state estimation comparison against simulator ground truth."""
    branch_id: int
    name: str
    branch_type: str = Field(..., description="'line' or 'trafo'")
    from_bus: int
    to_bus: int
    estimated_p_from_mw: float = Field(..., description="WLS estimated active power flow from bus (MW)")
    ground_truth_p_from_mw: float = Field(..., description="Pandapower ground truth active power flow (MW)")
    p_error_mw: float = Field(..., description="Absolute active power flow error (MW)")
    estimated_q_from_mvar: float = Field(..., description="WLS estimated reactive power flow from bus (MVAr)")
    ground_truth_q_from_mvar: float = Field(..., description="Pandapower ground truth reactive power flow (MVAr)")
    q_error_mvar: float = Field(..., description="Absolute reactive power flow error (MVAr)")


class BadDataReport(BaseModel):
    """Detailed report of bad data identification and suspicious measurement channels."""
    chi2_passed: bool = Field(..., description="True if Chi-square test passes (hypothesis of no bad data accepted)")
    bad_data_detected: bool = Field(..., description="True if Chi-square test fails or 3-sigma residuals found")
    chi2_threshold_exceeded: bool = Field(..., description="True if global objective exceeds critical Chi-square threshold")
    num_bad_measurements: int = Field(0, description="Count of measurement channels flagged as bad data")
    suspicious_channels: List[MeasurementChannel] = Field(default_factory=list, description="Channels exhibiting significant residual mismatches")
    identified_buses: List[int] = Field(default_factory=list, description="Buses associated with corrupt measurement channels")
    evidence_summary: List[str] = Field(default_factory=list, description="Specific mathematical evidence statements for bad data attribution")
    recovered_with_filtering: bool = Field(False, description="True if re-estimation succeeded after bad data removal")


class StateEstimationResult(BaseModel):
    """Unified result of Weighted Least Squares (WLS) state estimation."""
    timestamp: str
    topology_name: str
    converged: bool = Field(..., description="True if WLS iterative optimization reached convergence")
    algorithm: str = Field("Weighted Least Squares (WLS)", description="State estimation algorithm name")
    num_iterations: int = Field(..., description="Number of WLS Gauss-Newton iterations required")
    execution_time_ms: float = Field(..., description="Execution wall-clock time in milliseconds")
    num_measurements: int = Field(..., description="Total simulated measurement channels processed")
    num_missing_measurements: int = Field(0, description="Number of channels intentionally omitted or dropped")
    max_vm_error_pu: float = Field(..., description="Maximum bus voltage magnitude estimation error (p.u.)")
    rmse_vm_pu: float = Field(..., description="Root Mean Square Error of voltage magnitudes (p.u.)")
    max_va_error_degree: float = Field(..., description="Maximum voltage angle estimation error (deg)")
    rmse_va_degree: float = Field(..., description="Root Mean Square Error of voltage angles (deg)")
    bad_data_report: BadDataReport
    bus_estimates: List[BusStateEstimate] = Field(default_factory=list)
    branch_estimates: List[BranchFlowEstimate] = Field(default_factory=list)
    data_source_disclaimer: str = Field(
        "Simulated software telemetry generated from Pandapower AC power flow. No physical PMU hardware connection.",
        description="Explicit provenance disclaimer preventing fabricated measurement claims",
    )


class EstimationScenarioRequest(BaseModel):
    """Request parameters to evaluate state estimation across operational scenarios."""
    scenario: str = Field("normal", description="'normal', 'corrupted', or 'missing'")
    corrupted_bus_id: Optional[int] = Field(4, description="Target bus ID for synthetic bad data injection")
    corruption_type: Optional[str] = Field("voltage", description="'voltage', 'power', or 'both'")
    corruption_magnitude: Optional[float] = Field(0.30, description="Perturbation bias (e.g. +0.30 pu voltage or +40 MW power)")
    missing_channel_ratio: Optional[float] = Field(0.20, ge=0.0, le=0.50, description="Ratio of channels to drop in missing scenario")

