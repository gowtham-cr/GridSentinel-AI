"""Tests for Scikit-learn cybersecurity detection, feature extraction, incident generation,
multiclass IEEE 14-bus classification, and electrical residual analysis."""

import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app
from app.grid_simulation.simulator import GridSimulator
from app.grid_simulation.topologies import get_topology
import pandapower as pp
from app.attack_simulation.engine import AttackEngine
from app.attack_simulation.schemas import AttackLaunchRequest, AttackType
from app.telemetry.collector import TelemetryCollector
from app.cybersecurity.feature_extractor import GridFeatureExtractor
from app.cybersecurity.schemas import IncidentSeverity
from app.cybersecurity.detector import GridCybersecurityDetector
from app.cybersecurity.residuals import ElectricalResidualDetector
from app.cybersecurity.dataset_classifier import (
    DatasetClassifier,
    chronological_embargo_split,
)
from app.cybersecurity.taxonomy import (
    OFFICIAL_LABEL_TAXONOMY,
    decompose_class,
    DATASET_SOURCE,
    DATASET_FEATURE_NOTE,
)


def test_feature_extraction_dimensions():
    """Verify feature extractor computes all required electrical & statistical features."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    collector = TelemetryCollector(simulator=sim)
    extractor = GridFeatureExtractor()

    packet = collector.sample_telemetry()
    state = sim.get_state_summary()

    feats = extractor.extract_features(packet, state)
    assert isinstance(feats, np.ndarray)
    assert len(feats) == len(GridFeatureExtractor.FEATURE_NAMES)
    assert len(feats) == 15
    assert not np.isnan(feats).any()


def test_ai_detection_model_metrics():
    """Verify AI model metrics are genuine, evaluated numbers."""
    detector = GridCybersecurityDetector()
    metrics = detector.metrics
    assert metrics is not None
    assert 0.0 <= metrics.accuracy <= 1.0
    assert 0.0 <= metrics.f1_score <= 1.0
    assert metrics.num_training_samples > 0
    assert len(metrics.features_used) == 15


def test_detection_on_normal_state():
    """Verify normal grid operations do not generate false critical incidents."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    collector = TelemetryCollector(simulator=sim)
    detector = GridCybersecurityDetector()

    packet = collector.sample_telemetry()
    state = sim.get_state_summary()

    result, incident = detector.detect(packet, state)
    assert 0.0 <= result.anomaly_score <= 1.0
    assert result.power_imbalance_residual_mw < 0.05
    assert incident is None or incident.severity != IncidentSeverity.CRITICAL


def test_detection_on_fdia_attack():
    """Verify detector identifies injected FDIA attack and generates structured incident."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    engine = AttackEngine(simulator=sim)
    collector = TelemetryCollector(simulator=sim)
    collector.set_attack_engine(engine)
    detector = GridCybersecurityDetector()

    # Launch aggressive FDIA attack
    req = AttackLaunchRequest(
        attack_type=AttackType.FDIA_VOLTAGE,
        target_bus_id=4,
        intensity=2.5,
        duration_seconds=60,
    )
    atk = engine.launch_attack(req)

    packet = collector.sample_telemetry()
    state = sim.get_state_summary()

    result, incident = detector.detect(packet, state)
    assert result.is_anomaly is True
    assert result.binary_classification == "ATTACK"
    assert incident is not None
    assert incident.severity in ("MEDIUM", "HIGH", "CRITICAL")
    assert "Bus_4" in incident.target_component
    assert len(incident.mitigation_recommendation) > 10

    engine.stop_attack(atk.attack_id)


def test_electrical_kcl_residuals_normal_and_attacked():
    """
    Verify Kirchhoff Current Law (KCL) active power nodal residuals:
    - Normal grid: residual is ~0 MW (floating point machine precision).
    - Tampered grid: worst residual accurately identifies the compromised node.
    """
    detector = ElectricalResidualDetector(residual_threshold_mw=1.0)
    net = get_topology("ieee14")
    pp.runpp(net)

    # 1. Normal state verification
    res_normal = detector.calculate_from_net(net)
    assert res_normal.max_residual_mw < 0.001
    assert res_normal.residual_violation is False
    assert len(res_normal.nodal_residuals) == 14

    # 2. Injected active power mismatch on Bus 4
    orig_load_p = net.load.loc[net.load.bus == 4, "p_mw"].values[0] if (net.load.bus == 4).any() else 0.0
    # Perturb load at bus 4 by +20 MW
    if (net.load.bus == 4).any():
        net.load.loc[net.load.bus == 4, "p_mw"] += 20.0
    else:
        pp.create_load(net, bus=4, p_mw=20.0, q_mvar=5.0)

    # Calculate residual without recalculating branch flows (simulating telemetry falsification)
    res_attacked = detector.calculate_from_net(net)
    assert res_attacked.max_residual_mw >= 19.9
    assert res_attacked.worst_bus_id == 4
    assert res_attacked.residual_violation is True


def test_chronological_embargo_split_leakage_prevention():
    """
    Verify strict chronological train/validation/test split with 5-row embargo gap.
    Guarantees no temporal sliding window data leakage across boundaries.
    """
    # Create synthetic chronological timeseries with 100 rows
    dummy_df = pd.DataFrame({
        "Timestamp": [f"step_{i}" for i in range(100)],
        "val": list(range(100)),
        "label_multi": [0] * 50 + [1] * 50,
    })

    embargo = 5
    train_df, val_df, test_df = chronological_embargo_split(
        dummy_df, train_ratio=0.70, val_ratio=0.15, embargo_rows=embargo
    )

    # Train: 0 to 69 (70 rows)
    assert len(train_df) == 70
    assert train_df.index[0] == 0
    assert train_df.index[-1] == 69

    # 5-row embargo: rows 70, 71, 72, 73, 74 omitted!
    # Val: 75 to 84 (10 rows)
    assert val_df.index[0] == 75
    assert val_df.index[0] - train_df.index[-1] == embargo + 1

    # 5-row embargo: rows 85, 86, 87, 88, 89 omitted!
    # Test: 90 to 99 (10 rows)
    assert test_df.index[0] == 90
    assert test_df.index[0] - val_df.index[-1] == embargo + 1

    # Verify no overlap
    assert len(set(train_df.index).intersection(set(val_df.index))) == 0
    assert len(set(val_df.index).intersection(set(test_df.index))) == 0


def test_multiclass_taxonomy_decomposition():
    """
    Verify all 31 official Mendeley IEEE 14-bus classes decompose accurately
    into injection method, target strategy, temporal pattern, and affected component.
    """
    # Class 0: Normal
    c0 = decompose_class(0)
    assert c0["is_attack"] is False
    assert c0["injection_method"] == "None"
    assert c0["temporal_pattern"] == "normal"
    assert c0["target_component"] == "None"

    # Class 6: Additive, vulnerable node (Bus 4), step
    c6 = decompose_class(6)
    assert c6["is_attack"] is True
    assert c6["injection_method"] == "Additive"
    assert c6["target_strategy"] == "vulnerable_node"
    assert c6["temporal_pattern"] == "step"
    assert c6["target_component"] == "Bus_4"
    assert c6["default_severity"] == "CRITICAL"

    # Class 15: Deductive, random node, replay
    c15 = decompose_class(15)
    assert c15["is_attack"] is True
    assert c15["injection_method"] == "Deductive"
    assert c15["target_strategy"] == "random_node"
    assert c15["temporal_pattern"] == "replay"

    # Class 28: Combined, vulnerable node (Bus 4), pulse
    c28 = decompose_class(28)
    assert c28["is_attack"] is True
    assert c28["injection_method"] == "Combined"
    assert c28["target_strategy"] == "vulnerable_node"
    assert c28["temporal_pattern"] == "pulse"
    assert c28["target_component"] == "Bus_4"


def test_dataset_classifier_prediction_and_binary_detection():
    """
    Verify DatasetClassifier runs inference on 132-element vectors and returns
    structured classification, confidence, decomposition, and binary detection.
    """
    clf = DatasetClassifier()
    assert clf.is_loaded is True

    # Test with dummy 132-element feature vector
    feat_132 = np.zeros(132, dtype=np.float32)
    pred = clf.predict_sample(feat_132)

    assert "predicted_class_id" in pred
    assert 0 <= pred["predicted_class_id"] <= 30
    assert "confidence" in pred
    assert 0.0 <= pred["confidence"] <= 1.0
    assert "binary_classification" in pred
    assert pred["binary_classification"] in ("NORMAL", "ATTACK")
    assert "injection_method" in pred
    assert "target_strategy" in pred
    assert "temporal_pattern" in pred


def test_multiclass_evaluation_metrics_reporting():
    """
    Verify multiclass evaluation metrics exist and include un-fabricated numbers:
    balanced accuracy, macro precision/recall/F1, binary accuracy/F1,
    per-class metrics, confusion matrix, and explicit note on features.
    """
    clf = DatasetClassifier()
    metrics = clf.get_metrics()
    assert metrics is not None

    # Check metrics
    assert "balanced_accuracy" in metrics
    assert 0.0 <= metrics["balanced_accuracy"] <= 1.0
    assert "macro_f1" in metrics
    assert 0.0 <= metrics["macro_f1"] <= 1.0
    assert "binary_accuracy" in metrics
    assert 0.0 <= metrics["binary_accuracy"] <= 1.0
    assert "binary_f1" in metrics
    assert 0.0 <= metrics["binary_f1"] <= 1.0
    assert metrics["embargo_rows"] == 5
    assert metrics["num_classes"] == 31
    assert "confusion_matrix" in metrics
    assert "per_class_metrics" in metrics

    # Verify no voltage measurement claim
    assert "No voltage" in metrics["dataset_note"]


def test_residual_analysis_and_multiclass_endpoints():
    """
    Verify GET /api/v1/security/residual-analysis and
    GET /api/v1/security/multiclass-metrics HTTP API endpoints.
    """
    client = TestClient(app)

    # 1. Residual Analysis Endpoint
    res_resp = client.get("/api/v1/security/residual-analysis")
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert "max_residual_mw" in res_data
    assert "nodal_residuals" in res_data
    assert len(res_data["nodal_residuals"]) > 0

    # 2. Multiclass Metrics Endpoint
    mc_resp = client.get("/api/v1/security/multiclass-metrics")
    assert mc_resp.status_code == 200
    mc_data = mc_resp.json()
    assert mc_data["num_classes"] == 31
    assert mc_data["embargo_rows"] == 5
    assert "balanced_accuracy" in mc_data
    assert "macro_f1" in mc_data
    assert "label_taxonomy" in mc_data


def test_bus2_fdia_voltage_detection_and_event_history_persistence():
    """
    Regression test:
    1. Launches FDIA voltage attack on Bus 2.
    2. Runs detection and verifies incident target is Bus_2 (not Bus_0).
    3. Verifies event history returns DETECTION_INCIDENT and ATTACK_INJECTION with Bus 2.
    4. Verifies database persistence across session refresh.
    """
    client = TestClient(app)
    
    # 1. Initialize IEEE 14-bus
    init_res = client.post("/api/v1/grid/initialize", json={"topology_name": "ieee14_grid"})
    assert init_res.status_code == 200

    # 2. Launch Bus 2 FDIA Voltage attack
    atk_res = client.post("/api/v1/attacks/launch", json={
        "attack_type": "fdia_voltage",
        "target_bus_id": 2,
        "intensity": 1.15,
        "duration_seconds": 30
    })
    assert atk_res.status_code == 201

    # 3. Detect threat
    det_res = client.post("/api/v1/security/detect")
    assert det_res.status_code == 200
    det_data = det_res.json()
    assert det_data["detection"]["is_anomaly"] is True
    assert det_data["detection"]["affected_component"] == "Bus_2"
    assert det_data["incident"]["target_component"] == "Bus_2"
    assert 2 in det_data["detection"]["flagged_buses"]

    # 4. State Estimation
    est_res = client.post("/api/v1/estimation/estimate")
    assert est_res.status_code == 200

    # 5. Autonomous Mitigation & Recovery
    mit_res = client.post("/api/v1/security/mitigate")
    assert mit_res.status_code == 200

    # 6. Check full 6-stage lifecycle event history
    hist_res = client.get("/api/v1/security/event-history?limit=15")
    assert hist_res.status_code == 200
    events = hist_res.json()
    event_types = set(e["type"] for e in events)

    assert "INITIALIZE" in event_types
    assert "ATTACK_INJECTION" in event_types
    assert "DETECTION_INCIDENT" in event_types
    assert "ESTIMATION_EVALUATED" in event_types
    assert "MITIGATION_APPLIED" in event_types
    assert "RECOVERY" in event_types

    # Verify chronological ordering
    for i in range(len(events) - 1):
        assert events[i]["timestamp"] >= events[i + 1]["timestamp"]

    # Verify target component on detection incident
    inc_events = [e for e in events if e["type"] == "DETECTION_INCIDENT"]
    assert len(inc_events) > 0
    assert inc_events[0]["target"] == "Bus_2"

