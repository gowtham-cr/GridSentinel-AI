"""
Data schemas for the Coordinated Threat Intelligence Engine (CTIE).
Defines component observations, graph evidence, temporal metrics, and coordinated incident reports.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ComponentAnomalyObservation(BaseModel):
    """Observation of an anomalous or suspicious condition on an individual grid component."""
    component_id: str = Field(..., description="Component identifier, e.g. 'Bus_2', 'Line_1_2'")
    bus_id: Optional[int] = Field(None, description="Integer electrical bus ID if applicable")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of the observation")
    anomaly_types: List[str] = Field(
        default_factory=list,
        description="Types of anomalies, e.g. ['voltage_deviation', 'active_power_imbalance', 'replay_signature']",
    )
    severity_score: float = Field(0.0, ge=0.0, le=1.0, description="Heuristic degree of abnormality (0 to 1)")
    metrics: Dict[str, float] = Field(
        default_factory=dict,
        description="Raw physical deviations, e.g. {'delta_vm_pu': 0.08, 'delta_p_mw': 12.5}",
    )
    is_telemetry_delayed: bool = Field(False, description="Whether telemetry timestamp experienced delivery lag")
    is_telemetry_missing: bool = Field(False, description="Whether sensor channel suffered packet loss")


class GraphTopologyEvidence(BaseModel):
    """Mathematical graph topology evidence connecting suspicious components."""
    subgraph_nodes: List[int] = Field(default_factory=list, description="Bus IDs included in evaluated subgraph")
    connected_components_count: int = Field(1, description="Number of disconnected components in candidate subgraph")
    are_electrically_connected: bool = Field(False, description="Whether candidate components form a single connected component")
    mean_hop_distance: float = Field(0.0, description="Average topological shortest-path hop distance between candidate nodes")
    min_hop_distance: int = Field(0, description="Minimum shortest-path hop distance")
    max_hop_distance: int = Field(0, description="Maximum shortest-path hop distance")
    mean_admittance_mhos: float = Field(0.0, description="Average branch admittance coupling between candidates")
    graph_affinity_score: float = Field(0.0, ge=0.0, le=1.0, description="Spatial affinity score S_graph (0 to 1)")
    shortest_paths: Dict[str, List[int]] = Field(
        default_factory=dict,
        description="Shortest path node sequences between component pairs",
    )


class TemporalEvidence(BaseModel):
    """Temporal synchronization and sequence evidence across anomalies."""
    window_seconds: float = Field(15.0, description="Configured sliding time window tau_window")
    time_span_seconds: float = Field(0.0, description="Observed elapsed time span between earliest and latest anomaly")
    mean_inter_arrival_seconds: float = Field(0.0, description="Average time delta between sequential observations")
    time_variance_seconds2: float = Field(0.0, description="Sample variance of anomaly arrival times")
    synchronization_score: float = Field(0.0, ge=0.0, le=1.0, description="Temporal synchronization score S_temporal (0 to 1)")
    sequence_pattern: str = Field(
        "NORMAL",
        description="Temporal pattern: 'SYNCHRONOUS_BURST', 'SEQUENTIAL_PROPAGATION', 'DISPERSED_RANDOM', 'OUT_OF_WINDOW', 'SINGLE_EVENT'",
    )


class CrossComponentEvidence(BaseModel):
    """Cross-modal and multi-vector synergy evidence."""
    modalities_involved: List[str] = Field(
        default_factory=list,
        description="Distinct anomaly modalities, e.g. ['voltage', 'active_power', 'replay']",
    )
    cross_modal_synergy_score: float = Field(0.0, ge=0.0, le=1.0, description="Cross-modal synergy score S_cross (0 to 1)")
    evasion_synergy_detected: bool = Field(
        False,
        description="Whether pattern indicates coordinated evasion (e.g. complementary active/reactive shifts)",
    )
    uncertainty_penalty: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Uncertainty penalty deducted due to missing or delayed sensor channels",
    )


class CoordinatedIncidentReport(BaseModel):
    """Complete forensic assessment returned by the Coordinated Threat Intelligence Engine."""
    correlation_id: str = Field(..., description="Unique correlation UUID, e.g. 'CTIE-CORR-A1B2C3D4'")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Evaluation timestamp")
    classification: str = Field(
        ...,
        description="Classification: 'COORDINATED_MULTI_POINT_ATTACK', 'CONCURRENT_INDEPENDENT_ANOMALIES', 'ISOLATED_ANOMALY', 'NORMAL_GRID'",
    )
    is_coordinated: bool = Field(False, description="Boolean flag: True if coordinated multi-point attack detected")
    affected_components: List[str] = Field(default_factory=list, description="Components identified in the coordinated cluster")
    related_anomaly_ids: List[str] = Field(default_factory=list, description="IDs of component observations analyzed")
    combined_evidence_score: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Uncalibrated composite heuristic evidence score S_coord (0 to 1)",
    )
    graph_topology_evidence: GraphTopologyEvidence
    temporal_evidence: TemporalEvidence
    cross_component_evidence: CrossComponentEvidence
    explanation: str = Field(..., description="Explainable rationale detailing graph, temporal, and physical evidence")
    recommended_investigation: str = Field(..., description="Actionable operator steps for verification and containment")
    statistical_validation_note: str = Field(
        "Score represents uncalibrated composite heuristic evidence. Statistical confidence requires historical multi-attack ground truth calibration.",
        description="Transparency disclaimer adhering to strict engineering validation standards",
    )


class ModelStatusResponse(BaseModel):
    """Operational status and architecture parameters of the CTIE model."""
    module_name: str = "Coordinated Threat Intelligence Engine (CTIE)"
    architecture: str = "Graph-Based Temporal Anomaly Correlation Model"
    version: str = "1.0.0"
    topology: str = "IEEE 14-bus Benchmark"
    num_graph_nodes: int = 14
    num_graph_edges: int = 20
    sliding_window_seconds: float = 15.0
    spatial_affinity_scale_hops: float = 2.5
    temporal_sync_half_life_seconds: float = 3.0
    coordination_threshold: float = 0.55
    supports_tgnn_extension: bool = True
    is_active: bool = True


class CustomAnalysisRequest(BaseModel):
    """Request payload for evaluating custom or simulated multi-component anomaly scenarios."""
    observations: List[ComponentAnomalyObservation]
    topology_name: Optional[str] = "ieee14_grid"
    window_seconds: Optional[float] = 15.0
