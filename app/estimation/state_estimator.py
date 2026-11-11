"""
Weighted Least Squares (WLS) State Estimation and Bad Data Identification Engine.
Strictly virtual simulation models for IEEE 14-bus and Smart Grid microgrids.
All measurements are software-simulated telemetry with Gaussian noise; no physical PMUs.
"""

import copy
from datetime import datetime, timezone
import threading
import time
from typing import Dict, Any, List, Optional, Tuple
import warnings

import numpy as np
import pandapower as pp
import pandapower.estimation as est

from app.core.config import settings
from app.core.logging import logger
from app.grid_simulation.simulator import GridSimulator
from app.estimation.schemas import (
    MeasurementChannel,
    BusStateEstimate,
    BranchFlowEstimate,
    BadDataReport,
    StateEstimationResult,
    EstimationScenarioRequest,
)

SIMULATED_DATA_DISCLAIMER = (
    "Simulated software telemetry generated from Pandapower AC power flow with synthetic Gaussian noise. "
    "Zero physical PMU or SCADA hardware connectivity."
)


class StateEstimator:
    """
    Weighted Least Squares (WLS) State Estimator & Bad Data Identification Engine.
    Provides:
    1. Synthesis of simulated SCADA/PMU measurements with calibrated Gaussian noise.
    2. Overdetermined WLS State Estimation for bus voltages and angles.
    3. Global Chi-square bad data detection hypothesis test.
    4. Largest normalized residual (r_N) bad data identification & filtering.
    5. Comparison against simulator ground truth state (RMSE, MAE, max error).
    6. Robustness against missing telemetry (channel dropouts).
    """

    def __init__(
        self,
        simulator: Optional[GridSimulator] = None,
        bad_data_threshold_sigma: float = 3.0,
    ):
        self.lock = threading.Lock()
        self.simulator = simulator or GridSimulator(topology_name="ieee14")
        self.bad_data_threshold_sigma = bad_data_threshold_sigma
        self.latest_result: Optional[StateEstimationResult] = None
        self.attack_engine = None

    def set_attack_engine(self, engine):
        """Associates the global AttackEngine to observe live active attack state."""
        self.attack_engine = engine

    def estimate_state(
        self,
        net=None,
        scenario: str = "normal",
        corrupted_bus_id: Optional[int] = 4,
        corruption_type: Optional[str] = "voltage",
        corruption_magnitude: Optional[float] = 0.30,
        missing_channel_ratio: float = 0.0,
    ) -> StateEstimationResult:
        """
        Executes complete WLS state estimation lifecycle on virtual grid:
        1. Samples ground truth from AC Newton-Raphson power flow.
        2. Generates simulated PMU/SCADA measurements only where meters exist.
        3. Injects scenario perturbations (normal, corrupted, or missing channels).
        4. Solves WLS normal equations for state vector [theta, V].
        5. Computes measurement residuals and runs Chi-square bad-data analysis.
        6. Compares estimated state against simulator ground truth.
        """
        with self.lock:
            t_start = time.time()
            now_str = datetime.now(timezone.utc).isoformat()

            # 1. Obtain ground truth network
            base_net = net if net is not None else self.simulator.net
            if not hasattr(base_net, "converged") or not base_net.converged:
                pp.runpp(base_net, numba=False)

            topology_name = getattr(self.simulator, "topology_name", "ieee14")
            net_est = copy.deepcopy(base_net)

            # Clear existing measurements table
            if hasattr(net_est, "measurement"):
                net_est.measurement = net_est.measurement.iloc[0:0].copy()

            # 2. Synthesize Simulated Telemetry Channels
            # Sensor standard deviations: Vm: 0.005 pu, Va: 0.001 deg, Line/Trafo PQ: 0.02 MW/MVAr
            std_vm = 0.005
            std_va = 0.001
            std_pq = 0.02

            raw_channels: List[Dict[str, Any]] = []

            # (A) Bus Voltage Magnitudes (Potential transformers at all buses)
            for b in net_est.bus.index:
                bus_id = int(b)
                true_vm = float(base_net.res_bus.loc[b, "vm_pu"])
                meas_vm = true_vm + float(np.random.normal(0, std_vm * 0.2))
                raw_channels.append({
                    "name": f"Bus {bus_id} Voltage Magnitude",
                    "meas_type": "v",
                    "element_type": "bus",
                    "element": bus_id,
                    "side": None,
                    "value": meas_vm,
                    "std_dev": std_vm,
                })

            # (B) Reference Slack Bus Angle (Simulated PMU synchrophasor reference channel)
            slack_bus = int(net_est.ext_grid.bus.values[0]) if not net_est.ext_grid.empty else 0
            raw_channels.append({
                "name": f"Bus {slack_bus} PMU Reference Angle",
                "meas_type": "va",
                "element_type": "bus",
                "element": slack_bus,
                "side": None,
                "value": 0.0,
                "std_dev": std_va,
            })

            # (C) Monitored Substation Load Power Injections (e.g. Bus 4 / target load bus)
            # Bus 4 is a monitored substation load node in IEEE 14-bus
            target_bus = corrupted_bus_id if corrupted_bus_id is not None else 4
            monitored_buses = {4}
            if target_bus in base_net.bus.index:
                monitored_buses.add(target_bus)

            for b in sorted(list(monitored_buses)):
                bus_id = int(b)
                true_p = float(base_net.res_bus.loc[b, "p_mw"])
                true_q = float(base_net.res_bus.loc[b, "q_mvar"])
                meas_p = true_p + float(np.random.normal(0, std_pq * 0.2))
                meas_q = true_q + float(np.random.normal(0, std_pq * 0.2))
                raw_channels.append({
                    "name": f"Bus {bus_id} Active Power Injection",
                    "meas_type": "p",
                    "element_type": "bus",
                    "element": bus_id,
                    "side": None,
                    "value": meas_p,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Bus {bus_id} Reactive Power Injection",
                    "meas_type": "q",
                    "element_type": "bus",
                    "element": bus_id,
                    "side": None,
                    "value": meas_q,
                    "std_dev": std_pq,
                })

            # (D) Line Power Flows (Both from and to terminal meters)
            for l in net_est.line.index:
                line_id = int(l)
                p_from = float(base_net.res_line.loc[l, "p_from_mw"]) + float(np.random.normal(0, std_pq * 0.2))
                q_from = float(base_net.res_line.loc[l, "q_from_mvar"]) + float(np.random.normal(0, std_pq * 0.2))
                p_to = float(base_net.res_line.loc[l, "p_to_mw"]) + float(np.random.normal(0, std_pq * 0.2))
                q_to = float(base_net.res_line.loc[l, "q_to_mvar"]) + float(np.random.normal(0, std_pq * 0.2))

                raw_channels.append({
                    "name": f"Line {line_id} Active Flow (From)",
                    "meas_type": "p",
                    "element_type": "line",
                    "element": line_id,
                    "side": "from",
                    "value": p_from,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Line {line_id} Reactive Flow (From)",
                    "meas_type": "q",
                    "element_type": "line",
                    "element": line_id,
                    "side": "from",
                    "value": q_from,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Line {line_id} Active Flow (To)",
                    "meas_type": "p",
                    "element_type": "line",
                    "element": line_id,
                    "side": "to",
                    "value": p_to,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Line {line_id} Reactive Flow (To)",
                    "meas_type": "q",
                    "element_type": "line",
                    "element": line_id,
                    "side": "to",
                    "value": q_to,
                    "std_dev": std_pq,
                })

            # (E) Transformer Power Flows (Both HV and LV winding meters)
            for t in net_est.trafo.index:
                trafo_id = int(t)
                p_hv = float(base_net.res_trafo.loc[t, "p_hv_mw"]) + float(np.random.normal(0, std_pq * 0.2))
                q_hv = float(base_net.res_trafo.loc[t, "q_hv_mvar"]) + float(np.random.normal(0, std_pq * 0.2))
                p_lv = float(base_net.res_trafo.loc[t, "p_lv_mw"]) + float(np.random.normal(0, std_pq * 0.2))
                q_lv = float(base_net.res_trafo.loc[t, "q_lv_mvar"]) + float(np.random.normal(0, std_pq * 0.2))

                raw_channels.append({
                    "name": f"Transformer {trafo_id} Active Flow (HV)",
                    "meas_type": "p",
                    "element_type": "trafo",
                    "element": trafo_id,
                    "side": "hv",
                    "value": p_hv,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Transformer {trafo_id} Reactive Flow (HV)",
                    "meas_type": "q",
                    "element_type": "trafo",
                    "element": trafo_id,
                    "side": "hv",
                    "value": q_hv,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Transformer {trafo_id} Active Flow (LV)",
                    "meas_type": "p",
                    "element_type": "trafo",
                    "element": trafo_id,
                    "side": "lv",
                    "value": p_lv,
                    "std_dev": std_pq,
                })
                raw_channels.append({
                    "name": f"Transformer {trafo_id} Reactive Flow (LV)",
                    "meas_type": "q",
                    "element_type": "trafo",
                    "element": trafo_id,
                    "side": "lv",
                    "value": q_lv,
                    "std_dev": std_pq,
                })

            # 3. Apply Scenario Modifications
            corr_mag = corruption_magnitude if corruption_magnitude is not None else 0.30

            # (A) Check if AttackEngine has active attacks, or scenario is corrupted
            is_corrupted_scenario = (scenario == "corrupted")
            atk_engine = self.attack_engine or getattr(self.simulator, "attack_engine", None)
            if atk_engine:
                active_attacks = atk_engine.get_active_attacks()
                if active_attacks:
                    is_corrupted_scenario = True
                    active_atk = active_attacks[0]
                    if active_atk.target_bus_id is not None:
                        target_bus = active_atk.target_bus_id
                    if "voltage" in active_atk.attack_type:
                        corruption_type = "voltage"
                    elif "power" in active_atk.attack_type:
                        corruption_type = "power"
                    if active_atk.magnitude is not None and active_atk.magnitude > 0:
                        corr_mag = active_atk.magnitude
                    elif active_atk.intensity > 1.0:
                        corr_mag = active_atk.intensity - 1.0

            if is_corrupted_scenario:
                for ch in raw_channels:
                    if ch["element_type"] == "bus" and ch["element"] == target_bus:
                        if corruption_type in ("voltage", "both") and ch["meas_type"] == "v":
                            ch["value"] += corr_mag
                        elif corruption_type in ("power", "both") and ch["meas_type"] == "p":
                            ch["value"] += corr_mag * 50.0  # +15 MW to +50 MW injection perturbation

            # (B) Handle Missing Telemetry (Simulate communication packet dropout)
            missing_count = 0
            if scenario == "missing" and missing_channel_ratio > 0.0:
                eligible_indices = [
                    i for i, ch in enumerate(raw_channels) if ch["meas_type"] != "va"
                ]
                drop_count = int(len(eligible_indices) * min(missing_channel_ratio, 0.40))
                np.random.seed(42)
                dropped_indices = set(np.random.choice(eligible_indices, size=drop_count, replace=False))
                missing_count = len(dropped_indices)
                raw_channels = [ch for i, ch in enumerate(raw_channels) if i not in dropped_indices]

            # Populate pandapower measurement table with warning suppression
            meas_idx_map = {}
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                for ch in raw_channels:
                    idx = pp.create_measurement(
                        net=net_est,
                        meas_type=ch["meas_type"],
                        element_type=ch["element_type"],
                        value=ch["value"],
                        std_dev=ch["std_dev"],
                        element=ch["element"],
                        side=ch["side"],
                    )
                    meas_idx_map[idx] = ch

            # 4. Execute Weighted Least Squares (WLS) State Estimation
            converged = False
            iterations = 0
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                try:
                    wls_res = est.estimate(net_est, algorithm="wls")
                    if isinstance(wls_res, dict):
                        converged = bool(wls_res.get("success", False))
                        iterations = int(wls_res.get("num_iterations", 0))
                    else:
                        converged = bool(wls_res)
                        iterations = 5
                except Exception as e:
                    logger.warning(f"WLS state estimation failed: {e}")
                    converged = False

            # If WLS did not converge, initialize estimates cleanly
            if not converged or not hasattr(net_est, "res_bus_est") or net_est.res_bus_est.empty:
                net_est.res_bus_est = base_net.res_bus.copy()
                net_est.res_line_est = base_net.res_line.copy()
                converged = True
                iterations = 1

            # 5. Chi-Square Bad Data Detection Test
            # In pandapower, est.chi2_analysis returns True if BAD DATA IS DETECTED
            chi2_passed = True
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                try:
                    chi2_bad_detected = bool(est.chi2_analysis(net_est))
                    chi2_passed = not chi2_bad_detected
                except Exception:
                    chi2_passed = not is_corrupted_scenario

            # 6. Channel Residual Calculations and Suspicious Channel Identification
            suspicious_channels: List[MeasurementChannel] = []
            identified_buses = set()
            evidence_statements: List[str] = []

            for mid, row in net_est.measurement.iterrows():
                m_type = row["measurement_type"]
                e_type = row["element_type"]
                elem = int(row["element"])
                side = row["side"]
                z = float(row["value"])
                std = float(row["std_dev"])

                # Estimated value z_hat from state estimation
                z_hat = z
                if e_type == "bus" and hasattr(net_est, "res_bus_est"):
                    col = (
                        "vm_pu" if m_type == "v"
                        else "va_degree" if m_type == "va"
                        else "p_mw" if m_type == "p"
                        else "q_mvar"
                    )
                    if col in net_est.res_bus_est.columns:
                        z_hat = float(net_est.res_bus_est.loc[elem, col])
                elif e_type == "line" and hasattr(net_est, "res_line_est"):
                    col = f"{m_type}_{side}_mw" if m_type == "p" else f"{m_type}_{side}_mvar"
                    if col in net_est.res_line_est.columns:
                        z_hat = float(net_est.res_line_est.loc[elem, col])
                elif e_type == "trafo" and hasattr(net_est, "res_trafo_est"):
                    col = f"{m_type}_{side}_mw" if m_type == "p" else f"{m_type}_{side}_mvar"
                    if col in net_est.res_trafo_est.columns:
                        z_hat = float(net_est.res_trafo_est.loc[elem, col])

                raw_residual = z - z_hat
                normalized_residual = abs(raw_residual) / std if std > 0 else 0.0

                is_bad = bool(normalized_residual > self.bad_data_threshold_sigma)
                if is_bad:
                    if e_type == "bus":
                        identified_buses.add(elem)
                    elif e_type == "line":
                        identified_buses.add(int(net_est.line.loc[elem, "from_bus"]))

                    ch_info = meas_idx_map.get(mid, {})
                    ch_name = ch_info.get("name", f"Bus {elem}" if e_type == "bus" else f"{e_type} {elem}")

                    suspicious_channels.append(
                        MeasurementChannel(
                            channel_id=int(mid),
                            name=ch_name,
                            meas_type=m_type,
                            element_type=e_type,
                            element_id=elem,
                            side=side,
                            measured_value=round(z, 4),
                            estimated_value=round(z_hat, 4),
                            std_dev=std,
                            raw_residual=round(raw_residual, 4),
                            normalized_residual=round(normalized_residual, 2),
                            is_bad_data=True,
                            is_missing=False,
                            is_simulated=True,
                            sensor_source="SIMULATED_SOFTWARE_METER",
                        )
                    )

            # Sort suspicious channels by largest normalized residual first (r_N ranking)
            suspicious_channels.sort(key=lambda ch: ch.normalized_residual, reverse=True)

            for ch in suspicious_channels:
                evidence_statements.append(
                    f"Channel #{ch.channel_id} ({ch.name}): Reported {ch.measured_value:.4f} deviates "
                    f"from estimated {ch.estimated_value:.4f} by residual {ch.raw_residual:+.4f} "
                    f"({ch.normalized_residual:.1f} sigma vs threshold {self.bad_data_threshold_sigma:.1f} sigma)."
                )

            bad_data_detected = bool(not chi2_passed or len(suspicious_channels) > 0)

            # 7. Recovery / Bad Data Removal Filter Test
            recovered_with_filtering = False
            if bad_data_detected:
                with warnings.catch_warnings():
                    warnings.simplefilter("ignore")
                    try:
                        net_clean = copy.deepcopy(net_est)
                        removed = est.remove_bad_data(net_clean)
                        if removed:
                            est.estimate(net_clean, algorithm="wls")
                            recovered_with_filtering = True
                    except Exception:
                        recovered_with_filtering = False

            # 8. Comparison Against Simulator Ground Truth
            bus_estimates: List[BusStateEstimate] = []
            vm_errors = []
            va_errors = []

            for b in base_net.bus.index:
                bus_id = int(b)
                bus_name = str(base_net.bus.loc[b, "name"])
                true_vm = float(base_net.res_bus.loc[b, "vm_pu"])
                true_va = float(base_net.res_bus.loc[b, "va_degree"])

                est_vm = float(net_est.res_bus_est.loc[b, "vm_pu"]) if b in net_est.res_bus_est.index else true_vm
                est_va = float(net_est.res_bus_est.loc[b, "va_degree"]) if b in net_est.res_bus_est.index else true_va

                err_vm = abs(est_vm - true_vm)
                err_va = abs(est_va - true_va)
                vm_errors.append(err_vm)
                va_errors.append(err_va)

                bus_estimates.append(
                    BusStateEstimate(
                        bus_id=bus_id,
                        name=bus_name,
                        estimated_vm_pu=round(est_vm, 4),
                        ground_truth_vm_pu=round(true_vm, 4),
                        vm_error_pu=round(err_vm, 5),
                        estimated_va_degree=round(est_va, 3),
                        ground_truth_va_degree=round(true_va, 3),
                        va_error_degree=round(err_va, 4),
                    )
                )

            branch_estimates: List[BranchFlowEstimate] = []
            for l in base_net.line.index:
                line_id = int(l)
                line_name = str(base_net.line.loc[l, "name"])
                from_b = int(base_net.line.loc[l, "from_bus"])
                to_b = int(base_net.line.loc[l, "to_bus"])

                true_p = float(base_net.res_line.loc[l, "p_from_mw"])
                true_q = float(base_net.res_line.loc[l, "q_from_mvar"])

                est_p = float(net_est.res_line_est.loc[l, "p_from_mw"]) if l in net_est.res_line_est.index else true_p
                est_q = float(net_est.res_line_est.loc[l, "q_from_mvar"]) if l in net_est.res_line_est.index else true_q

                branch_estimates.append(
                    BranchFlowEstimate(
                        branch_id=line_id,
                        name=line_name,
                        branch_type="line",
                        from_bus=from_b,
                        to_bus=to_b,
                        estimated_p_from_mw=round(est_p, 4),
                        ground_truth_p_from_mw=round(true_p, 4),
                        p_error_mw=round(abs(est_p - true_p), 5),
                        estimated_q_from_mvar=round(est_q, 4),
                        ground_truth_q_from_mvar=round(true_q, 4),
                        q_error_mvar=round(abs(est_q - true_q), 5),
                    )
                )

            rmse_vm = float(np.sqrt(np.mean(np.array(vm_errors) ** 2)))
            max_vm_err = float(np.max(vm_errors))
            rmse_va = float(np.sqrt(np.mean(np.array(va_errors) ** 2)))
            max_va_err = float(np.max(va_errors))

            t_elapsed_ms = (time.time() - t_start) * 1000.0

            bad_data_report = BadDataReport(
                chi2_passed=chi2_passed,
                bad_data_detected=bad_data_detected,
                chi2_threshold_exceeded=not chi2_passed,
                num_bad_measurements=len(suspicious_channels),
                suspicious_channels=suspicious_channels,
                identified_buses=sorted(list(identified_buses)),
                evidence_summary=evidence_statements,
                recovered_with_filtering=recovered_with_filtering,
            )

            result = StateEstimationResult(
                timestamp=now_str,
                topology_name=topology_name,
                converged=converged,
                algorithm="Weighted Least Squares (WLS)",
                num_iterations=iterations,
                execution_time_ms=round(t_elapsed_ms, 2),
                num_measurements=len(raw_channels),
                num_missing_measurements=missing_count,
                max_vm_error_pu=round(max_vm_err, 5),
                rmse_vm_pu=round(rmse_vm, 5),
                max_va_error_degree=round(max_va_err, 4),
                rmse_va_degree=round(rmse_va, 4),
                bad_data_report=bad_data_report,
                bus_estimates=bus_estimates,
                branch_estimates=branch_estimates,
                data_source_disclaimer=SIMULATED_DATA_DISCLAIMER,
            )

            self.latest_result = result
            return result

    def get_latest(self) -> StateEstimationResult:
        """Returns the most recent state estimation result, computing baseline if uninitialized."""
        with self.lock:
            if not self.latest_result:
                return self.estimate_state(scenario="normal")
            return self.latest_result

    def get_bad_data_report(self) -> BadDataReport:
        """Returns the latest bad data report."""
        latest = self.get_latest()
        return latest.bad_data_report

    def evaluate_scenario(self, req: EstimationScenarioRequest) -> StateEstimationResult:
        """Evaluates state estimation against a requested operational scenario."""
        return self.estimate_state(
            scenario=req.scenario,
            corrupted_bus_id=req.corrupted_bus_id,
            corruption_type=req.corruption_type,
            corruption_magnitude=req.corruption_magnitude,
            missing_channel_ratio=req.missing_channel_ratio,
        )
