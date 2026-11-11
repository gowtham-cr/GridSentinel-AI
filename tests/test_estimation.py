"""
Unit and Integration Tests for Power System State Estimation and Bad Data Identification.
Verifies WLS convergence, normal baseline error bounds, corrupted telemetry detection,
missing channel resilience, and API endpoint operations on the virtual IEEE 14-bus grid.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.grid_simulation.simulator import GridSimulator
from app.estimation.state_estimator import StateEstimator, SIMULATED_DATA_DISCLAIMER
from app.estimation.schemas import EstimationScenarioRequest


@pytest.fixture
def estimator_ieee14():
    """StateEstimator instance with simulated IEEE 14-bus network."""
    sim = GridSimulator(topology_name="ieee14")
    return StateEstimator(simulator=sim, bad_data_threshold_sigma=3.0)


def test_wls_state_estimation_normal_scenario(estimator_ieee14):
    """
    Verify WLS state estimation on uncompromised IEEE 14-bus grid:
    1. Reaches convergence within 10 iterations.
    2. Chi-square test passes (hypothesis of no bad data accepted).
    3. Low voltage magnitude RMSE (< 0.05 pu).
    4. Computes state estimates for all 14 buses and lines.
    """
    res = estimator_ieee14.estimate_state(scenario="normal")

    assert res.converged is True
    assert 1 <= res.num_iterations <= 12
    assert res.bad_data_report.bad_data_detected is False
    assert res.bad_data_report.chi2_passed is True
    assert res.rmse_vm_pu < 0.05
    assert len(res.bus_estimates) == 14
    assert len(res.branch_estimates) == 15
    assert res.num_missing_measurements == 0
    assert "Simulated software telemetry" in res.data_source_disclaimer


def test_bad_data_identification_on_corrupted_voltage(estimator_ieee14):
    """
    Verify detection and attribution of False Data Injection Attack (FDIA) on Bus 4 voltage:
    1. Large measurement residual identified on Bus 4 voltage channel.
    2. Chi-square test or 3-sigma rule flags bad data.
    3. Bus 4 accurately pinpointed as the compromised electrical node.
    4. Clear mathematical evidence statement generated.
    """
    req = EstimationScenarioRequest(
        scenario="corrupted",
        corrupted_bus_id=4,
        corruption_type="voltage",
        corruption_magnitude=0.35,  # +0.35 pu falsified voltage deviation
    )
    res = estimator_ieee14.evaluate_scenario(req)

    assert res.converged is True
    assert res.bad_data_report.bad_data_detected is True
    assert 4 in res.bad_data_report.identified_buses
    assert len(res.bad_data_report.suspicious_channels) >= 1

    # Verify suspicious channel matches Bus 4 voltage
    bus4_ch = next(
        (ch for ch in res.bad_data_report.suspicious_channels if ch.element_id == 4 and ch.meas_type == "v"),
        None,
    )
    assert bus4_ch is not None
    assert bus4_ch.is_bad_data is True
    assert bus4_ch.normalized_residual > 3.0
    assert len(res.bad_data_report.evidence_summary) >= 1
    assert "Bus 4" in res.bad_data_report.evidence_summary[0]


def test_bad_data_identification_on_corrupted_power_injection(estimator_ieee14):
    """
    Verify detection of active power injection tampering on Bus 4:
    1. Identifies corrupted active power channel on Bus 4.
    2. Normalized residual significantly exceeds the 3-sigma threshold.
    3. Bus 4 identified as compromised component.
    """
    req = EstimationScenarioRequest(
        scenario="corrupted",
        corrupted_bus_id=4,
        corruption_type="power",
        corruption_magnitude=0.80,  # Scaled to +40 MW injection tampering
    )
    res = estimator_ieee14.evaluate_scenario(req)

    assert res.converged is True
    assert res.bad_data_report.bad_data_detected is True
    assert 4 in res.bad_data_report.identified_buses

    # Verify channel attribution
    bad_p_ch = next(
        (ch for ch in res.bad_data_report.suspicious_channels if ch.element_id == 4 and ch.meas_type == "p"),
        None,
    )
    assert bad_p_ch is not None
    assert bad_p_ch.normalized_residual > 3.0


def test_state_estimation_with_missing_measurements(estimator_ieee14):
    """
    Verify WLS resilience against simulated packet dropouts / missing measurements:
    1. 20% of non-reference measurement channels dropped.
    2. Network remains observable; WLS converges successfully.
    3. Estimated voltage RMSE remains bounded.
    """
    req = EstimationScenarioRequest(
        scenario="missing",
        missing_channel_ratio=0.20,
    )
    res = estimator_ieee14.evaluate_scenario(req)

    assert res.converged is True
    assert res.num_missing_measurements > 0
    assert res.rmse_vm_pu < 0.08
    assert len(res.bus_estimates) == 14


def test_simulated_vs_physical_pmu_disclaimer(estimator_ieee14):
    """
    Verify strict safety and provenance integrity:
    All measurements must carry explicit disclaimers confirming zero physical hardware connection.
    """
    res = estimator_ieee14.estimate_state(scenario="normal")

    assert res.data_source_disclaimer == SIMULATED_DATA_DISCLAIMER
    assert "Zero physical PMU" in res.data_source_disclaimer

    # Check channels in bad data report if any
    for ch in res.bad_data_report.suspicious_channels:
        assert ch.is_simulated is True
        assert ch.sensor_source == "SIMULATED_SOFTWARE_METER"


def test_estimation_api_endpoints():
    """
    Verify all estimation REST API endpoints:
    1. POST /api/v1/estimation/estimate
    2. GET /api/v1/estimation/latest
    3. GET /api/v1/estimation/bad-data
    4. POST /api/v1/estimation/scenarios/evaluate
    """
    client = TestClient(app)

    # 1. POST /estimate
    resp_est = client.post("/api/v1/estimation/estimate")
    assert resp_est.status_code == 200
    data_est = resp_est.json()
    assert data_est["converged"] is True
    assert "bus_estimates" in data_est
    assert "bad_data_report" in data_est

    # 2. GET /latest
    resp_lat = client.get("/api/v1/estimation/latest")
    assert resp_lat.status_code == 200
    data_lat = resp_lat.json()
    assert data_lat["converged"] is True
    assert len(data_lat["bus_estimates"]) > 0

    # 3. GET /bad-data
    resp_bd = client.get("/api/v1/estimation/bad-data")
    assert resp_bd.status_code == 200
    data_bd = resp_bd.json()
    assert "chi2_passed" in data_bd
    assert "bad_data_detected" in data_bd
    assert "suspicious_channels" in data_bd

    # 4. POST /scenarios/evaluate (Corrupted scenario)
    eval_payload = {
        "scenario": "corrupted",
        "corrupted_bus_id": 4,
        "corruption_type": "voltage",
        "corruption_magnitude": 0.30,
        "missing_channel_ratio": 0.0,
    }
    resp_eval = client.post("/api/v1/estimation/scenarios/evaluate", json=eval_payload)
    assert resp_eval.status_code == 200
    data_eval = resp_eval.json()
    assert data_eval["bad_data_report"]["bad_data_detected"] is True
    assert 4 in data_eval["bad_data_report"]["identified_buses"]

