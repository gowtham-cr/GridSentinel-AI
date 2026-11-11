"""
Graph-Based Temporal Anomaly Correlation Model for GridSentinel CTIE.
Integrates spatial graph distance, temporal alignment, and multi-modal evidence.
Modularly structured with an abstract base class for future TGNN extension.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone

from app.coordinated_intelligence.schemas import (
    ComponentAnomalyObservation,
    GraphTopologyEvidence,
    TemporalEvidence,
    CrossComponentEvidence,
    CoordinatedIncidentReport,
)
from app.coordinated_intelligence.topology_graph import GridTopologyGraph
from app.coordinated_intelligence.temporal_correlator import TemporalCorrelator
from app.coordinated_intelligence.anomaly_relationships import CrossComponentEvidenceEvaluator


class BaseCorrelationModel(ABC):
    """Abstract base class for coordinated threat intelligence correlation models."""

    @abstractmethod
    def evaluate(
        self,
        observations: List[ComponentAnomalyObservation],
        topology_graph: GridTopologyGraph,
    ) -> CoordinatedIncidentReport:
        """Evaluates component anomaly observations and returns a coordinated incident report."""
        pass


class GraphTemporalCorrelationModel(BaseCorrelationModel):
    """
    Primary Implementation: Transparent Graph-Based Temporal Anomaly Correlation Model.
    
    Mathematical Formulation:
      1. Spatial Graph Affinity: S_graph = exp(-(mean_hops - 1.0) / sigma_spatial)
      2. Temporal Synchronization: S_temporal = exp(-(mean_delta_t + 0.5 * std_t) / tau_sync) * I(time_span <= tau_window)
      3. Cross-Modal Synergy: S_cross = 0.5 * mean_severity + 0.3 * modality_diversity + evasion_bonus
      4. Combined Evidence Score:
         S_coord = clamp(w_graph * S_graph + w_temporal * S_temporal + w_cross * S_cross - U, 0.0, 1.0)
      
      Decision Threshold:
        If |Components| >= 2 AND S_coord >= 0.55 AND S_graph >= 0.35 AND S_temporal >= 0.35:
          -> COORDINATED_MULTI_POINT_ATTACK
    """

    def __init__(
        self,
        window_seconds: float = 15.0,
        sync_half_life_seconds: float = 3.0,
        spatial_scale_hops: float = 2.5,
        weight_graph: float = 0.35,
        weight_temporal: float = 0.35,
        weight_cross: float = 0.30,
        coordination_threshold: float = 0.55,
    ):
        self.window_seconds = window_seconds
        self.temporal_correlator = TemporalCorrelator(
            window_seconds=window_seconds,
            sync_half_life_seconds=sync_half_life_seconds,
        )
        self.spatial_scale_hops = spatial_scale_hops
        self.evidence_evaluator = CrossComponentEvidenceEvaluator()

        self.weight_graph = weight_graph
        self.weight_temporal = weight_temporal
        self.weight_cross = weight_cross
        self.coordination_threshold = coordination_threshold

    def evaluate(
        self,
        observations: List[ComponentAnomalyObservation],
        topology_graph: GridTopologyGraph,
    ) -> CoordinatedIncidentReport:
        """Executes transparent graph-temporal correlation inference."""
        correlation_id = f"CTIE-CORR-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.now(timezone.utc)

        # Handle Scenario 1: Normal baseline
        if not observations:
            empty_graph_ev = topology_graph.evaluate_subgraph_affinity([])
            empty_temp_ev = self.temporal_correlator.evaluate_temporal_correlation([])
            empty_cross_ev = self.evidence_evaluator.evaluate_cross_component_evidence([])
            return CoordinatedIncidentReport(
                correlation_id=correlation_id,
                timestamp=now,
                classification="NORMAL_GRID",
                is_coordinated=False,
                affected_components=[],
                related_anomaly_ids=[],
                combined_evidence_score=0.0,
                graph_topology_evidence=empty_graph_ev,
                temporal_evidence=empty_temp_ev,
                cross_component_evidence=empty_cross_ev,
                explanation="All monitored electrical bus nodes and branch lines are operating within nominal baseline margins. No anomalous telemetry detected.",
                recommended_investigation="Continue standard digital twin telemetry monitoring. No corrective action required.",
            )

        # Handle Scenario 2: Single isolated anomaly
        if len(observations) == 1:
            single_comp = observations[0].component_id
            b_id = observations[0].bus_id if observations[0].bus_id is not None else _extract_bus_id(single_comp)
            graph_ev = topology_graph.evaluate_subgraph_affinity([b_id] if b_id is not None else [])
            temp_ev = self.temporal_correlator.evaluate_temporal_correlation(observations)
            cross_ev = self.evidence_evaluator.evaluate_cross_component_evidence(observations)

            single_score = round(min(0.20, observations[0].severity_score * 0.20), 4)

            return CoordinatedIncidentReport(
                correlation_id=correlation_id,
                timestamp=now,
                classification="ISOLATED_ANOMALY",
                is_coordinated=False,
                affected_components=[single_comp],
                related_anomaly_ids=[single_comp],
                combined_evidence_score=single_score,
                graph_topology_evidence=graph_ev,
                temporal_evidence=temp_ev,
                cross_component_evidence=cross_ev,
                explanation=f"A single isolated perturbation was detected on {single_comp}. Multi-point topological correlation requires at least two distinct grid components; no coordinated threat pattern exists.",
                recommended_investigation=f"Inspect local substation instrumentation at {single_comp} for sensor calibration drift or transient load variation.",
            )

        # Multi-Component Evaluation (>= 2 observations)
        candidate_bus_ids: List[int] = []
        comp_ids: List[str] = []
        for obs in observations:
            comp_ids.append(obs.component_id)
            if obs.bus_id is not None:
                candidate_bus_ids.append(obs.bus_id)
            else:
                parsed_id = _extract_bus_id(obs.component_id)
                if parsed_id is not None:
                    candidate_bus_ids.append(parsed_id)

        # 1. Graph Evidence
        graph_ev = topology_graph.evaluate_subgraph_affinity(
            candidate_buses=candidate_bus_ids,
            spatial_scale=self.spatial_scale_hops,
        )

        # 2. Temporal Evidence
        temp_ev = self.temporal_correlator.evaluate_temporal_correlation(observations)

        # 3. Cross-Modal Evidence
        cross_ev = self.evidence_evaluator.evaluate_cross_component_evidence(observations)

        # 4. Mathematical Combination
        s_g = graph_ev.graph_affinity_score
        s_t = temp_ev.synchronization_score
        s_c = cross_ev.cross_modal_synergy_score
        u_pen = cross_ev.uncertainty_penalty

        raw_combined = (
            self.weight_graph * s_g
            + self.weight_temporal * s_t
            + self.weight_cross * s_c
            - u_pen
        )
        combined_score = round(float(min(1.0, max(0.0, raw_combined))), 4)

        # 5. Classification Rules
        is_coordinated = False
        classification = "CONCURRENT_INDEPENDENT_ANOMALIES"

        # Scenario 5 Check: Out of temporal window
        if temp_ev.sequence_pattern == "OUT_OF_WINDOW":
            classification = "CONCURRENT_INDEPENDENT_ANOMALIES"
            is_coordinated = False
            explanation = (
                f"Multiple anomalies detected on components {comp_ids}, but the observed time span "
                f"({temp_ev.time_span_seconds:.2f}s) strictly exceeds the correlation window "
                f"({self.window_seconds:.1f}s). Out-of-window events cannot be classified as coordinated attacks."
            )
            recommended_inv = "Treat observations as separate asynchronous events. Investigate individual component maintenance logs."

        # Scenario 3 Check: Electrically disconnected or distant (> 3.5 hops)
        elif not graph_ev.are_electrically_connected or (graph_ev.mean_hop_distance >= 4.0 and s_g < 0.30):
            classification = "CONCURRENT_INDEPENDENT_ANOMALIES"
            is_coordinated = False
            explanation = (
                f"Multiple concurrent anomalies detected on {comp_ids}, but components lack topological proximity "
                f"(Mean hop distance: {graph_ev.mean_hop_distance:.1f} hops, Graph affinity: {s_g:.3f}). "
                f"Observations represent independent concurrent events or background sensor noise."
            )
            recommended_inv = "Verify that remote events do not share common supervisory SCADA control routes. No coordinated network dispatch detected."

        # Scenario 4 Check: Coordinated Multi-Point Attack
        elif (
            combined_score >= self.coordination_threshold
            and s_g >= 0.35
            and s_t >= 0.35
        ):
            classification = "COORDINATED_MULTI_POINT_ATTACK"
            is_coordinated = True
            explanation = (
                f"CRITICAL COORDINATED ATTACK DETECTED: Synchronized multi-point perturbations verified across "
                f"electrically coupled nodes {comp_ids} (Mean topological distance: {graph_ev.mean_hop_distance:.1f} hops, "
                f"Graph affinity: {s_g:.3f}). Temporal synchronization is high ({temp_ev.sequence_pattern}, "
                f"span: {temp_ev.time_span_seconds:.2f}s, S_temporal: {s_t:.3f}). "
                f"Cross-modal synergy score is {s_c:.3f}."
            )
            if cross_ev.evasion_synergy_detected:
                explanation += " Pattern exhibits deliberate multi-vector evasion signatures designed to bypass single-bus KCL residual checks."
            if u_pen > 0:
                explanation += f" Uncertainty penalty of -{u_pen:.2f} applied due to missing/delayed telemetry."

            recommended_inv = (
                f"1. Isolate SCADA control streams for components {comp_ids}.\n"
                f"2. Engage multi-bus Bad Data Detection (BDD) across candidate cluster.\n"
                f"3. Activate BESS reserve dispatch to stabilize inter-bus power flow.\n"
                f"4. Inspect firewall logs for coordinated distributed denial-of-service or spoofing commands."
            )

        else:
            # Low combined evidence
            classification = "CONCURRENT_INDEPENDENT_ANOMALIES"
            is_coordinated = False
            explanation = (
                f"Weak correlation across components {comp_ids}. Combined evidence score ({combined_score:.3f}) "
                f"remains below coordination threshold ({self.coordination_threshold:.2f}). "
                f"Spatial affinity={s_g:.3f}, Temporal sync={s_t:.3f}, Cross-modal={s_c:.3f}."
            )
            recommended_inv = "Monitor telemetry for subsequent escalation. Log observations for forensic review."

        return CoordinatedIncidentReport(
            correlation_id=correlation_id,
            timestamp=now,
            classification=classification,
            is_coordinated=is_coordinated,
            affected_components=comp_ids,
            related_anomaly_ids=comp_ids,
            combined_evidence_score=combined_score,
            graph_topology_evidence=graph_ev,
            temporal_evidence=temp_ev,
            cross_component_evidence=cross_ev,
            explanation=explanation,
            recommended_investigation=recommended_inv,
        )


def _extract_bus_id(component_str: str) -> Optional[int]:
    """Extracts integer bus ID from component name like 'Bus_2', 'Bus 4', etc."""
    try:
        import re
        match = re.search(r"bus[_\s]*(\d+)", component_str, re.IGNORECASE)
        if match:
            return int(match.group(1))
        # Direct integer check
        return int(component_str)
    except Exception:
        return None
