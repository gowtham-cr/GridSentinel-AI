"""
Unit and Integration Tests for Coordinated Threat Intelligence Engine (CTIE).
Strictly validates all 7 mandatory scenarios:
1. Normal baseline: no coordinated incident.
2. One subtle anomaly: no coordinated incident.
3. Multiple unrelated anomalies: no false coordination.
4. Multiple related subtle anomalies: identify coordinated activity.
5. Related anomalies outside time window: no coordinated classification.
6. Missing and delayed telemetry: handle uncertainty correctly.
7. Topology changes: use actual graph connectivity.
"""

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
import networkx as nx

from app.main import app
from app.coordinated_intelligence.schemas import (
    ComponentAnomalyObservation,
    CoordinatedIncidentReport,
    ModelStatusResponse,
)
from app.coordinated_intelligence.topology_graph import GridTopologyGraph
from app.coordinated_intelligence.temporal_correlator import TemporalCorrelator
from app.coordinated_intelligence.correlation_model import GraphTemporalCorrelationModel
from app.coordinated_intelligence.service import CoordinatedIntelligenceService
from app.api.dependencies import get_grid_simulator, get_telemetry_collector

client = TestClient(app)


@pytest.fixture
def ctie_service():
    simulator = get_grid_simulator()
    collector = get_telemetry_collector()
    return CoordinatedIntelligenceService(simulator=simulator, collector=collector)


def test_scenario_1_normal_baseline(ctie_service):
    """Scenario 1: Normal baseline -> No coordinated incident, classification='NORMAL_GRID'."""
    report = ctie_service.analyze_custom_scenario(observations=[])
    assert report.is_coordinated is False
    assert report.classification == "NORMAL_GRID"
    assert report.combined_evidence_score == 0.0
    assert len(report.affected_components) == 0


def test_scenario_2_single_subtle_anomaly(ctie_service):
    """Scenario 2: One subtle anomaly -> No coordinated incident, classification='ISOLATED_ANOMALY'."""
    now = datetime.now(timezone.utc)
    obs = [
        ComponentAnomalyObservation(
            component_id="Bus_2",
            bus_id=2,
            timestamp=now,
            anomaly_types=["voltage_deviation"],
            severity_score=0.45,
            metrics={"delta_vm_pu": 0.045},
        )
    ]
    report = ctie_service.analyze_custom_scenario(observations=obs)
    assert report.is_coordinated is False
    assert report.classification == "ISOLATED_ANOMALY"
    assert report.combined_evidence_score <= 0.20
    assert report.affected_components == ["Bus_2"]
    assert "single isolated" in report.explanation.lower()


def test_scenario_3_multiple_unrelated_anomalies_no_false_coordination(ctie_service):
    """
    Scenario 3: Multiple unrelated anomalies -> No false coordination.
    Buses 0 and 13 are at opposite extremes of IEEE 14-bus network (4+ hops apart, disparate voltage levels).
    """
    now = datetime.now(timezone.utc)
    obs = [
        ComponentAnomalyObservation(
            component_id="Bus_0",
            bus_id=0,
            timestamp=now,
            anomaly_types=["voltage_deviation"],
            severity_score=0.35,
            metrics={"delta_vm_pu": 0.035},
        ),
        ComponentAnomalyObservation(
            component_id="Bus_13",
            bus_id=13,
            timestamp=now + timedelta(seconds=11.5),
            anomaly_types=["active_power_surge"],
            severity_score=0.30,
            metrics={"delta_p_mw": 8.0},
        ),
    ]
    report = ctie_service.analyze_custom_scenario(observations=obs)
    assert report.is_coordinated is False
    assert report.classification == "CONCURRENT_INDEPENDENT_ANOMALIES"
    assert report.combined_evidence_score < 0.55
    assert report.graph_topology_evidence.mean_hop_distance >= 3.0


def test_scenario_4_multiple_related_subtle_anomalies_detects_coordination(ctie_service):
    """
    Scenario 4: Multiple related subtle anomalies -> Identify coordinated activity.
    Buses 1, 2, and 3 are tightly coupled transmission nodes (1 hop apart, shared 69kV transmission corridor).
    Perturbations are synchronized within 1.0s.
    """
    now = datetime.now(timezone.utc)
    obs = [
        ComponentAnomalyObservation(
            component_id="Bus_1",
            bus_id=1,
            timestamp=now,
            anomaly_types=["voltage_deviation", "telemetry_falsification"],
            severity_score=0.65,
            metrics={"delta_vm_pu": 0.06},
        ),
        ComponentAnomalyObservation(
            component_id="Bus_2",
            bus_id=2,
            timestamp=now + timedelta(seconds=0.4),
            anomaly_types=["active_power_surge", "load_tampering"],
            severity_score=0.70,
            metrics={"delta_p_mw": 14.5},
        ),
        ComponentAnomalyObservation(
            component_id="Bus_3",
            bus_id=3,
            timestamp=now + timedelta(seconds=0.9),
            anomaly_types=["voltage_deviation", "reactive_divergence"],
            severity_score=0.60,
            metrics={"delta_q_mvar": 5.2},
        ),
    ]
    report = ctie_service.analyze_custom_scenario(observations=obs, window_seconds=15.0)
    assert report.is_coordinated is True
    assert report.classification == "COORDINATED_MULTI_POINT_ATTACK"
    assert report.combined_evidence_score >= 0.55
    assert report.graph_topology_evidence.graph_affinity_score >= 0.70
    assert report.temporal_evidence.synchronization_score >= 0.60
    assert report.temporal_evidence.sequence_pattern == "SYNCHRONOUS_BURST"
    assert set(report.affected_components) == {"Bus_1", "Bus_2", "Bus_3"}


def test_scenario_5_related_anomalies_outside_time_window(ctie_service):
    """
    Scenario 5: Related anomalies outside time window -> No coordinated classification.
    Buses 1 and 2 are adjacent (1 hop), but perturbations occur 35 seconds apart (> 15s window).
    """
    now = datetime.now(timezone.utc)
    obs = [
        ComponentAnomalyObservation(
            component_id="Bus_1",
            bus_id=1,
            timestamp=now,
            anomaly_types=["voltage_deviation"],
            severity_score=0.70,
        ),
        ComponentAnomalyObservation(
            component_id="Bus_2",
            bus_id=2,
            timestamp=now + timedelta(seconds=35.0),
            anomaly_types=["voltage_deviation"],
            severity_score=0.75,
        ),
    ]
    report = ctie_service.analyze_custom_scenario(observations=obs, window_seconds=15.0)
    assert report.is_coordinated is False
    assert report.temporal_evidence.sequence_pattern == "OUT_OF_WINDOW"
    assert report.temporal_evidence.synchronization_score == 0.0
    assert report.combined_evidence_score < 0.55
    assert "exceeds the correlation window" in report.explanation.lower()


def test_scenario_6_missing_and_delayed_telemetry_uncertainty_handling(ctie_service):
    """
    Scenario 6: Missing and delayed telemetry -> Handle uncertainty correctly.
    Verifies that missing or delayed packets apply an uncertainty penalty, lowering confidence.
    """
    now = datetime.now(timezone.utc)
    # Baseline observations with perfect telemetry
    obs_clean = [
        ComponentAnomalyObservation(
            component_id="Bus_1",
            bus_id=1,
            timestamp=now,
            anomaly_types=["voltage_deviation"],
            severity_score=0.55,
        ),
        ComponentAnomalyObservation(
            component_id="Bus_2",
            bus_id=2,
            timestamp=now + timedelta(seconds=0.5),
            anomaly_types=["power_surge"],
            severity_score=0.55,
        ),
    ]
    report_clean = ctie_service.analyze_custom_scenario(observations=obs_clean)

    # Identical observations but degraded by packet loss and latency
    obs_degraded = [
        ComponentAnomalyObservation(
            component_id="Bus_1",
            bus_id=1,
            timestamp=now,
            anomaly_types=["voltage_deviation"],
            severity_score=0.55,
            is_telemetry_delayed=True,
        ),
        ComponentAnomalyObservation(
            component_id="Bus_2",
            bus_id=2,
            timestamp=now + timedelta(seconds=0.5),
            anomaly_types=["power_surge"],
            severity_score=0.55,
            is_telemetry_missing=True,
        ),
    ]
    report_degraded = ctie_service.analyze_custom_scenario(observations=obs_degraded)

    assert report_degraded.cross_component_evidence.uncertainty_penalty > 0.0
    assert report_degraded.combined_evidence_score < report_clean.combined_evidence_score
    assert "uncertainty penalty" in report_degraded.explanation.lower()


def test_scenario_7_topology_changes_actual_graph_connectivity(ctie_service):
    """
    Scenario 7: Topology changes -> Uses actual graph connectivity.
    When a line is opened, graph distance recalculates accurately.
    """
    topo_graph = ctie_service.topology_graph

    # IEEE 14-bus: Bus 1 and Bus 2 are directly connected via line (1 hop)
    dist_baseline = topo_graph.get_hop_distance(1, 2)
    assert dist_baseline == 1

    # Simulate line outage (remove edge 1-2)
    topo_graph.graph.remove_edge(1, 2)
    dist_after_outage = topo_graph.get_hop_distance(1, 2)
    # With line 1-2 opened, shortest path must go through Bus 3 (1-3-2) or Bus 0-4-3 (2 hops)
    assert dist_after_outage >= 2

    # Graph affinity between Bus 1 and 2 is reduced after line outage
    evidence_after_outage = topo_graph.evaluate_subgraph_affinity([1, 2])
    assert evidence_after_outage.mean_hop_distance == dist_after_outage

    # Restore topology graph from simulator
    ctie_service.refresh_topology()
    assert topo_graph.get_hop_distance(1, 2) == 1


def test_ctie_api_endpoints():
    """Verify independent HTTP API endpoints for CTIE."""
    # 1. Model Status
    res_status = client.get("/api/v1/coordinated-intelligence/model-status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["architecture"] == "Graph-Based Temporal Anomaly Correlation Model"
    assert status_data["num_graph_nodes"] == 14
    assert status_data["num_graph_edges"] == 20
    assert status_data["supports_tgnn_extension"] is True

    # 2. Graph Topology
    res_graph = client.get("/api/v1/coordinated-intelligence/graph-topology")
    assert res_graph.status_code == 200
    graph_data = res_graph.json()
    assert graph_data["num_nodes"] == 14
    assert graph_data["num_edges"] == 20
    assert len(graph_data["nodes"]) == 14

    # 3. Analyze Live State
    res_analyze = client.post("/api/v1/coordinated-intelligence/analyze?window_seconds=15.0")
    assert res_analyze.status_code == 200
    report_data = res_analyze.json()
    assert "correlation_id" in report_data
    assert "classification" in report_data
    assert "combined_evidence_score" in report_data

    # 4. Analyze Custom Scenario
    now_iso = datetime.now(timezone.utc).isoformat()
    custom_payload = {
        "observations": [
            {
                "component_id": "Bus_2",
                "bus_id": 2,
                "timestamp": now_iso,
                "anomaly_types": ["voltage_deviation"],
                "severity_score": 0.8,
            },
            {
                "component_id": "Bus_3",
                "bus_id": 3,
                "timestamp": now_iso,
                "anomaly_types": ["power_surge"],
                "severity_score": 0.8,
            },
        ],
        "window_seconds": 15.0,
    }
    res_custom = client.post("/api/v1/coordinated-intelligence/analyze-scenario", json=custom_payload)
    assert res_custom.status_code == 200
    custom_report = res_custom.json()
    assert custom_report["is_coordinated"] is True
    assert custom_report["classification"] == "COORDINATED_MULTI_POINT_ATTACK"

    # 5. Incidents Endpoint
    res_inc = client.get("/api/v1/coordinated-intelligence/incidents?limit=10")
    assert res_inc.status_code == 200
    assert isinstance(res_inc.json(), list)
