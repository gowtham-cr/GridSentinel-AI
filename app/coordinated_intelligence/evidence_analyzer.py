"""
Evidence Analyzer and Explainer for GridSentinel CTIE.
Translates mathematical graph-temporal outputs into structured, transparent forensic explanations.
"""

from typing import Dict, Any, List
from app.coordinated_intelligence.schemas import CoordinatedIncidentReport


class EvidenceAnalyzer:
    """
    Transforms quantitative evidence metrics from GraphTemporalCorrelationModel
    into structured, auditable forensic explanations for SOC operators.
    """

    @staticmethod
    def generate_forensic_summary(report: CoordinatedIncidentReport) -> Dict[str, Any]:
        """Produces a structured forensic breakdown of an evaluation report."""
        graph_ev = report.graph_topology_evidence
        temp_ev = report.temporal_evidence
        cross_ev = report.cross_component_evidence

        verdict_badge = "CRITICAL_COORDINATED" if report.is_coordinated else "UNCOORDINATED"

        key_findings: List[str] = []
        if report.classification == "COORDINATED_MULTI_POINT_ATTACK":
            key_findings.append(
                f"Multi-point coordinated intrusion confirmed across {len(report.affected_components)} nodes: {', '.join(report.affected_components)}"
            )
            key_findings.append(
                f"Topological coupling: Average shortest-path distance is {graph_ev.mean_hop_distance:.1f} hops (Graph Affinity: {graph_ev.graph_affinity_score:.2f})"
            )
            key_findings.append(
                f"Temporal synchronization: {temp_ev.sequence_pattern} within {temp_ev.time_span_seconds:.2f}s (Sync Score: {temp_ev.synchronization_score:.2f})"
            )
            if cross_ev.evasion_synergy_detected:
                key_findings.append(
                    f"Evasion synergy detected: Simultaneous manipulation of multiple modalities ({', '.join(cross_ev.modalities_involved)})"
                )
        elif report.classification == "ISOLATED_ANOMALY":
            key_findings.append(
                f"Single component abnormality at {', '.join(report.affected_components)}. Insufficient nodes for coordinated pattern."
            )
        elif report.classification == "CONCURRENT_INDEPENDENT_ANOMALIES":
            if temp_ev.sequence_pattern == "OUT_OF_WINDOW":
                key_findings.append(
                    f"Asynchronous events: Elapsed time span ({temp_ev.time_span_seconds:.1f}s) exceeds correlation window ({temp_ev.window_seconds:.1f}s)."
                )
            else:
                key_findings.append(
                    f"Unrelated concurrent anomalies: Topologically dispersed ({graph_ev.mean_hop_distance:.1f} hops) with low spatial affinity ({graph_ev.graph_affinity_score:.2f})."
                )
        else:
            key_findings.append("Nominal grid operation: All monitored telemetry within expected electrical limits.")

        if cross_ev.uncertainty_penalty > 0:
            key_findings.append(
                f"Uncertainty penalty applied: -{cross_ev.uncertainty_penalty:.2f} due to packet loss or delayed delivery."
            )

        return {
            "correlation_id": report.correlation_id,
            "verdict_badge": verdict_badge,
            "classification": report.classification,
            "combined_score": report.combined_evidence_score,
            "key_findings": key_findings,
            "graph_metrics": {
                "subgraph_nodes": graph_ev.subgraph_nodes,
                "connected": graph_ev.are_electrically_connected,
                "mean_hops": graph_ev.mean_hop_distance,
                "affinity_score": graph_ev.graph_affinity_score,
                "admittance_coupling": graph_ev.mean_admittance_mhos,
            },
            "temporal_metrics": {
                "span_seconds": temp_ev.time_span_seconds,
                "pattern": temp_ev.sequence_pattern,
                "sync_score": temp_ev.synchronization_score,
                "mean_delta_seconds": temp_ev.mean_inter_arrival_seconds,
            },
            "cross_modal_metrics": {
                "modalities": cross_ev.modalities_involved,
                "synergy_score": cross_ev.cross_modal_synergy_score,
                "evasion_synergy": cross_ev.evasion_synergy_detected,
                "uncertainty_penalty": cross_ev.uncertainty_penalty,
            },
            "explanation": report.explanation,
            "recommended_investigation": report.recommended_investigation,
        }

