"""REST API endpoints for Power System State Estimation and Bad Data Identification."""

import uuid
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_state_estimator, get_grid_simulator, get_db
from app.estimation.state_estimator import StateEstimator
from app.estimation.schemas import (
    StateEstimationResult,
    BadDataReport,
    EstimationScenarioRequest,
)
from app.grid_simulation.simulator import GridSimulator
from app.database.models import SimulationRunRecord
from app.core.logging import logger

router = APIRouter(prefix="/estimation", tags=["Power System State Estimation & Bad Data"])


@router.post("/estimate", response_model=StateEstimationResult)
def run_state_estimation(
    estimator: StateEstimator = Depends(get_state_estimator),
    db: Session = Depends(get_db),
):
    """
    Executes Weighted Least Squares (WLS) state estimation on virtual IEEE 14-bus or microgrid telemetry.
    Calculates voltage magnitudes, phase angles, line power flows, measurement residuals,
    and performs Chi-square bad data detection.
    """
    res = estimator.estimate_state(scenario="normal")
    try:
        run_rec = SimulationRunRecord(
            run_uuid=f"EST-{uuid.uuid4().hex[:8].upper()}",
            topology_name=getattr(estimator.simulator, "topology_name", "ieee14"),
            action="ESTIMATION",
            step_count=res.num_iterations,
            speed_hz=1.0,
            converged=res.converged,
            total_p_gen_mw=float(estimator.simulator.net.res_gen.p_mw.sum()) if hasattr(estimator.simulator.net, "res_gen") and not estimator.simulator.net.res_gen.empty else 0.0,
            total_p_load_mw=float(estimator.simulator.net.res_load.p_mw.sum()) if hasattr(estimator.simulator.net, "res_load") and not estimator.simulator.net.res_load.empty else 0.0,
            min_vm_pu=float(min([b.estimated_vm_pu for b in res.bus_estimates])) if res.bus_estimates else 1.0,
            max_vm_pu=float(max([b.estimated_vm_pu for b in res.bus_estimates])) if res.bus_estimates else 1.0,
            voltage_violations=len([b for b in res.bus_estimates if b.estimated_vm_pu < 0.95 or b.estimated_vm_pu > 1.05]),
            overloaded_lines=0,
            notes=f"WLS state estimation evaluated ({len(res.bus_estimates)} buses, RMSE {res.rmse_vm_pu:.4f} pu, bad data: {res.bad_data_report.bad_data_detected}).",
        )
        db.add(run_rec)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to record estimation run in SQLite: {e}")
        db.rollback()
    return res


@router.get("/latest", response_model=StateEstimationResult)
def get_latest_estimation(
    estimator: StateEstimator = Depends(get_state_estimator),
):
    """
    Retrieves the most recent state estimation results, including bus state estimates,
    branch flows, and comparison against simulator ground truth.
    """
    return estimator.get_latest()


@router.get("/bad-data", response_model=BadDataReport)
def get_bad_data_report(
    estimator: StateEstimator = Depends(get_state_estimator),
):
    """
    Retrieves comprehensive bad data identification report:
    - Chi-square hypothesis testing results
    - Suspicious measurement channels with normalized residuals (r_N) exceeding 3-sigma
    - Identified attacked buses with specific mathematical evidence
    - Recovery verification status
    """
    return estimator.get_bad_data_report()


@router.post("/scenarios/evaluate", response_model=StateEstimationResult)
def evaluate_estimation_scenario(
    request: EstimationScenarioRequest,
    estimator: StateEstimator = Depends(get_state_estimator),
    db: Session = Depends(get_db),
):
    """
    Evaluates state estimation and bad-data identification across controlled scenarios:
    - 'normal': Nominal telemetry with standard sensor Gaussian noise.
    - 'corrupted': Synthetic false data injection (FDIA) on targeted bus voltage or power injection.
    - 'missing': Simulated packet loss / channel dropouts (e.g. 20% dropped telemetry).
    """
    res = estimator.evaluate_scenario(request)
    try:
        run_rec = SimulationRunRecord(
            run_uuid=f"EST-{uuid.uuid4().hex[:8].upper()}",
            topology_name=getattr(estimator.simulator, "topology_name", "ieee14"),
            action="ESTIMATION",
            step_count=res.num_iterations,
            speed_hz=1.0,
            converged=res.converged,
            total_p_gen_mw=float(estimator.simulator.net.res_gen.p_mw.sum()) if hasattr(estimator.simulator.net, "res_gen") and not estimator.simulator.net.res_gen.empty else 0.0,
            total_p_load_mw=float(estimator.simulator.net.res_load.p_mw.sum()) if hasattr(estimator.simulator.net, "res_load") and not estimator.simulator.net.res_load.empty else 0.0,
            min_vm_pu=float(min([b.estimated_vm_pu for b in res.bus_estimates])) if res.bus_estimates else 1.0,
            max_vm_pu=float(max([b.estimated_vm_pu for b in res.bus_estimates])) if res.bus_estimates else 1.0,
            voltage_violations=len([b for b in res.bus_estimates if b.estimated_vm_pu < 0.95 or b.estimated_vm_pu > 1.05]),
            overloaded_lines=0,
            notes=f"WLS scenario '{request.scenario}' evaluated ({len(res.bus_estimates)} buses, RMSE {res.rmse_vm_pu:.4f} pu, bad data: {res.bad_data_report.bad_data_detected}).",
        )
        db.add(run_rec)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to record estimation run in SQLite: {e}")
        db.rollback()
    return res

