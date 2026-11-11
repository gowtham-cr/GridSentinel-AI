"""
Service Layer for Coordinated Threat Intelligence Engine (CTIE).
Coordinates graph topology tracking, telemetry observation ingestion, model evaluation, and SQLite persistence.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import json
import uuid
from sqlalchemy.orm import Session

from app.grid_simulation.simulator import GridSimulator
from app.telemetry.collector import TelemetryCollector
from app.coordinated_intelligence.schemas import (
    ComponentAnomalyObservation,
    CoordinatedIncidentReport,
    ModelStatusResponse,
)
from app.coordinated_intelligence.topology_graph import GridTopologyGraph
from app.coordinated_intelligence.correlation_model import GraphTemporalCorrelationModel
from app.coordinated_intelligence.evidence_analyzer import EvidenceAnalyzer
from app.database.models import SecurityIncident, SimulationRunRecord
from app.core.logging import logger


class CoordinatedIntelligenceService:
    """
    Independent service orchestrating the Graph-Based Temporal Anomaly Correlation Model.
    Consumes grid simulation and telemetry in read-only mode without modifying existing pipelines.
    """

    def __init__(
        self,
        simulator: GridSimulator,
        collector: TelemetryCollector,
        window_seconds: float = 15.0,
    ):
        self.simulator = simulator
        self.collector = collector
        self.window_seconds = window_seconds

        # Build initial topology graph from simulator network
        self.topology_graph = GridTopologyGraph(net=simulator.net)
        self.correlation_model = GraphTemporalCorrelationModel(window_seconds=window_seconds)
        self.evidence_analyzer = EvidenceAnalyzer()

        # In-memory store of evaluated reports for rapid query
        self.recent_reports: List[CoordinatedIncidentReport] = []

    def refresh_topology(self) -> None:
        """Re-reads the pandapower network instance to reflect topological switching changes."""
        if hasattr(self.simulator, "net") and self.simulator.net is not None:
            self.topology_graph.build_from_pandapower(self.simulator.net)

    def analyze_live_state(
        self,
        db: Optional[Session] = None,
        window_seconds: Optional[float] = None,
    ) -> CoordinatedIncidentReport:
        """
        Samples live telemetry in read-only mode, extracts component anomalies,
        and evaluates multi-node coordinated threat patterns.
        """
        self.refresh_topology()
        packet = self.collector.sample_telemetry()
        w_sec = window_seconds or self.window_seconds
        self.correlation_model.window_seconds = w_sec
        self.correlation_model.temporal_correlator.window_seconds = w_sec

        observations: List[ComponentAnomalyObservation] = []
        now = packet.timestamp or datetime.now(timezone.utc)

        # 1. Identify suspicious buses from live telemetry
        for b in packet.buses:
            anom_types = []
            metrics = {"vm_pu": float(b.vm_pu), "va_degree": float(b.va_degree)}

            # Voltage statutory limits
            if b.vm_pu < 0.90 or b.vm_pu > 1.10:
                anom_types.append("voltage_deviation")
                metrics["delta_vm_pu"] = float(abs(b.vm_pu - 1.0))

            # Telemetry spoofing indicator
            if getattr(b, "is_spoofed", False):
                anom_types.append("telemetry_falsification")

            # Active power injection abnormalities
            if abs(b.p_mw) > 120.0:
                anom_types.append("active_power_surge")
                metrics["p_mw"] = float(b.p_mw)

            if anom_types:
                severity = 0.5
                if "telemetry_falsification" in anom_types or "voltage_deviation" in anom_types:
                    severity = min(1.0, 0.4 + metrics.get("delta_vm_pu", 0.05) * 4.0)

                observations.append(
                    ComponentAnomalyObservation(
                        component_id=f"Bus_{b.bus_id}",
                        bus_id=b.bus_id,
                        timestamp=now,
                        anomaly_types=anom_types,
                        severity_score=round(severity, 3),
                        metrics=metrics,
                    )
                )

        # 2. Check active attack vectors for multi-component context
        if hasattr(self.simulator, "attack_engine") and self.simulator.attack_engine:
            active_attacks = self.simulator.attack_engine.get_active_attacks()
            for atk in active_attacks:
                c_id = f"Bus_{atk.target_bus_id}" if atk.target_bus_id is not None else atk.target_component
                # If not already present
                if not any(o.component_id == c_id for o in observations):
                    observations.append(
                        ComponentAnomalyObservation(
                            component_id=c_id,
                            bus_id=atk.target_bus_id,
                            timestamp=now,
                            anomaly_types=[atk.attack_type, "active_attack_injection"],
                            severity_score=min(1.0, 0.5 * atk.intensity),
                            metrics={"intensity": atk.intensity},
                        )
                    )

        report = self.correlation_model.evaluate(observations, self.topology_graph)
        self.recent_reports.append(report)
        if len(self.recent_reports) > 100:
            self.recent_reports.pop(0)

        # Persist coordinated incident to SQLite if confirmed and db session provided
        if report.is_coordinated and db is not None:
            self._persist_coordinated_incident(report, db)

        return report

    def analyze_custom_scenario(
        self,
        observations: List[ComponentAnomalyObservation],
        window_seconds: Optional[float] = None,
        db: Optional[Session] = None,
    ) -> CoordinatedIncidentReport:
        """Directly evaluates a provided list of component anomaly observations."""
        self.refresh_topology()
        w_sec = window_seconds or self.window_seconds
        self.correlation_model.window_seconds = w_sec
        self.correlation_model.temporal_correlator.window_seconds = w_sec

        report = self.correlation_model.evaluate(observations, self.topology_graph)
        self.recent_reports.append(report)
        if len(self.recent_reports) > 100:
            self.recent_reports.pop(0)

        if report.is_coordinated and db is not None:
            self._persist_coordinated_incident(report, db)

        return report

    def get_model_status(self) -> ModelStatusResponse:
        """Returns metadata, graph size, and configuration parameters of the CTIE model."""
        self.refresh_topology()
        topo_name = getattr(self.simulator, "topology_name", "IEEE 14-bus Benchmark")
        return ModelStatusResponse(
            module_name="Coordinated Threat Intelligence Engine (CTIE)",
            architecture="Graph-Based Temporal Anomaly Correlation Model",
            version="1.0.0",
            topology=topo_name,
            num_graph_nodes=self.topology_graph.graph.number_of_nodes(),
            num_graph_edges=self.topology_graph.graph.number_of_edges(),
            sliding_window_seconds=self.correlation_model.window_seconds,
            spatial_affinity_scale_hops=self.correlation_model.spatial_scale_hops,
            temporal_sync_half_life_seconds=self.correlation_model.temporal_correlator.sync_half_life_seconds,
            coordination_threshold=self.correlation_model.coordination_threshold,
            supports_tgnn_extension=True,
            is_active=True,
        )

    def get_graph_topology(self) -> Dict[str, Any]:
        """Returns JSON-serializable graph topology for the frontend visualizer."""
        self.refresh_topology()
        return self.topology_graph.to_dict()

    def get_coordinated_incidents(
        self,
        db: Session,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Queries persisted coordinated threat events from SQLite."""
        incidents = (
            db.query(SecurityIncident)
            .filter(SecurityIncident.attack_type == "COORDINATED_THREAT_ANALYSIS")
            .order_by(SecurityIncident.timestamp.desc())
            .limit(limit)
            .all()
        )
        results = []
        for inc in incidents:
            results.append({
                "correlation_id": inc.incident_uuid,
                "timestamp": inc.timestamp.isoformat(),
                "classification": "COORDINATED_MULTI_POINT_ATTACK",
                "affected_components": inc.target_component.split(", "),
                "severity": inc.severity,
                "combined_evidence_score": inc.anomaly_score,
                "confidence": inc.confidence,
                "resolved": inc.resolved,
                "details": json.loads(inc.details_json) if inc.details_json else {},
            })
        return results

    def _persist_coordinated_incident(self, report: CoordinatedIncidentReport, db: Session) -> None:
        """Persists a verified coordinated threat report into SQLite without colliding with single-bus detector."""
        try:
            details = {
                "correlation_id": report.correlation_id,
                "affected_components": report.affected_components,
                "graph_evidence": report.graph_topology_evidence.model_dump(),
                "temporal_evidence": report.temporal_evidence.model_dump(),
                "cross_component_evidence": report.cross_component_evidence.model_dump(),
                "explanation": report.explanation,
                "recommended_investigation": report.recommended_investigation,
            }
            inc = SecurityIncident(
                incident_uuid=report.correlation_id,
                attack_type="COORDINATED_THREAT_ANALYSIS",
                severity="CRITICAL",
                target_component=", ".join(report.affected_components),
                anomaly_score=report.combined_evidence_score,
                confidence=report.combined_evidence_score,  # Heuristic evidence score
                voltage_violation=True,
                thermal_overload=False,
                power_imbalance_violation=True,
                details_json=json.dumps(details),
                resolved=False,
            )
            db.add(inc)

            # Also record in SimulationRunRecord as COORDINATED_CORRELATION
            run_rec = SimulationRunRecord(
                run_uuid=f"CTIE-{uuid.uuid4().hex[:8].upper()}",
                topology_name=getattr(self.simulator, "topology_name", "ieee14_grid"),
                action="COORDINATED_CORRELATION",
                step_count=len(report.affected_components),
                speed_hz=1.0,
                converged=True,
                total_p_gen_mw=0.0,
                total_p_load_mw=0.0,
                min_vm_pu=1.0,
                max_vm_pu=1.0,
                voltage_violations=len(report.affected_components),
                overloaded_lines=0,
                notes=f"Coordinated Threat Intelligence: {report.classification} ({', '.join(report.affected_components)}). Score: {report.combined_evidence_score:.3f}",
            )
            db.add(run_rec)
            db.commit()
            logger.info(f"[CTIE] Persisted coordinated threat incident {report.correlation_id} on {report.affected_components}")
        except Exception as e:
            logger.warning(f"[CTIE] Failed to persist coordinated incident in SQLite: {e}")
            db.rollback()
