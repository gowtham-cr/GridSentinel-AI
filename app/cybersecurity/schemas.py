"""Pydantic schemas for cybersecurity detection, ML metrics, residual analysis, and incident reports."""

from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class IncidentSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class NodalResidual(BaseModel):
    """Kirchhoff active power residual at a specific substation bus."""
    bus_id: int
    p_inj_mw: float = Field(..., description="Net bus power injection (Generation - Load) in MW")
    p_leaving_mw: float = Field(..., description="Sum of active power flows exiting bus via branches in MW")
    residual_mw: float = Field(..., description="Absolute nodal power mismatch |P_inj - P_leaving| in MW")
    is_violation: bool = Field(..., description="True if residual exceeds bad-data engineering threshold")


class ResidualAnalysisResult(BaseModel):
    """Comprehensive physical residual-based anomaly detection results."""
    timestamp: str
    max_residual_mw: float = Field(..., description="Worst bus nodal active power residual in MW")
    worst_bus_id: Optional[int] = Field(None, description="Bus ID exhibiting maximum Kirchhoff mismatch")
    system_imbalance_mw: float = Field(..., description="Whole-grid power imbalance |P_gen - P_load - P_losses| in MW")
    residual_threshold_mw: float = Field(..., description="Configured bad data detection threshold in MW")
    residual_violation: bool = Field(..., description="True if nodal or system residual violates physics laws")
    nodal_residuals: List[NodalResidual] = Field(default_factory=list, description="Per-bus residual breakdown")


class DetectionResult(BaseModel):
    """Result of AI/ML evaluation and physics verification on current grid telemetry."""
    timestamp: str
    is_anomaly: bool = Field(..., description="True if anomaly score crosses threshold or physics violation detected")
    anomaly_score: float = Field(..., ge=0.0, le=1.0, description="Normalized anomaly score (0 = normal, 1 = anomalous)")
    predicted_attack_type: str = Field(..., description="Classified attack vector or 'NORMAL'")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classifier prediction confidence probability")
    physics_violation_detected: bool
    power_imbalance_residual_mw: float
    voltage_violations_count: int
    overloaded_lines_count: int
    flagged_buses: List[int] = Field(default_factory=list)

    # Multiclass & Decomposition Extensions (Classes 0-30)
    predicted_class_id: int = Field(0, description="Mendeley IEEE 14-bus multiclass ID (0=Normal, 1-30=Attacks)")
    injection_method: Optional[str] = Field(None, description="Attack injection method: Additive, Deductive, Combined, or None")
    target_strategy: Optional[str] = Field(None, description="Attack target strategy: random_node, vulnerable_node, or None")
    temporal_pattern: Optional[str] = Field(None, description="Attack temporal pattern: step, ramp, pulse, random, replay, or normal")
    is_attack: bool = Field(False, description="Binary detection flag (True if class > 0 or anomaly detected)")
    binary_classification: str = Field("NORMAL", description="'NORMAL' or 'ATTACK'")

    # Electrical Residual Grounding
    max_nodal_residual_mw: float = Field(0.0, description="Worst nodal KCL active power residual in MW")
    worst_residual_bus_id: Optional[int] = Field(None, description="Bus ID with highest KCL power mismatch")
    residual_anomaly_detected: bool = Field(False, description="True if electrical residual exceeds threshold")
    affected_component: Optional[str] = Field(None, description="Identified affected electrical node or telemetry stream")
    severity: IncidentSeverity = Field(IncidentSeverity.LOW, description="Assessed threat severity level")


class SecurityIncidentReport(BaseModel):
    """Structured security incident report generated upon cyber anomaly detection."""
    incident_id: str
    timestamp: str
    attack_type: str
    severity: IncidentSeverity
    target_component: str
    anomaly_score: float
    confidence: float
    voltage_violation: bool
    thermal_overload: bool
    power_imbalance_violation: bool
    details: Dict[str, Any]
    mitigation_recommendation: str
    resolved: bool = False

    # Decomposition metadata
    predicted_class_id: Optional[int] = None
    injection_method: Optional[str] = None
    target_strategy: Optional[str] = None
    temporal_pattern: Optional[str] = None


class ModelMetrics(BaseModel):
    """Evaluation metrics of the Scikit-learn detection models."""
    model_type: str
    trained_at: str
    num_training_samples: int
    num_test_samples: int
    accuracy: float
    f1_score: float
    features_used: List[str]
    model_file_path: str

    # Extended Multiclass & Embargo Evaluation Metrics
    balanced_accuracy: Optional[float] = None
    macro_precision: Optional[float] = None
    macro_recall: Optional[float] = None
    macro_f1: Optional[float] = None
    binary_accuracy: Optional[float] = None
    binary_precision: Optional[float] = None
    binary_recall: Optional[float] = None
    binary_f1: Optional[float] = None
    embargo_rows: int = 5
    train_samples: Optional[int] = None
    val_samples: Optional[int] = None
    test_samples: Optional[int] = None
    num_classes: int = 31
    per_class_metrics: Optional[Dict[str, Dict[str, float]]] = None
    confusion_matrix: Optional[List[List[int]]] = None
    label_taxonomy: Optional[Dict[str, Any]] = None
    dataset_source: Optional[str] = None
    dataset_note: Optional[str] = None
