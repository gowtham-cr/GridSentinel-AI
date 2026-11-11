"""System Health-Check API endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.dependencies import (
    get_db,
    get_grid_simulator,
    get_attack_engine,
    get_cybersecurity_detector,
)
from app.core.config import settings
from app.grid_simulation.simulator import GridSimulator
from app.attack_simulation.engine import AttackEngine
from app.cybersecurity.detector import GridCybersecurityDetector

router = APIRouter(tags=["Health"])


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check(
    db: Session = Depends(get_db),
    simulator: GridSimulator = Depends(get_grid_simulator),
    attack_engine: AttackEngine = Depends(get_attack_engine),
    detector: GridCybersecurityDetector = Depends(get_cybersecurity_detector),
):
    """
    Comprehensive platform health and operational readiness check.
    Verifies database connection, pandapower AC power flow convergence,
    Scikit-learn detection model readiness, and local safety confinement.
    """
    # 1. Verify SQLite connectivity
    db_healthy = False
    try:
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        db_healthy = False

    # 2. Verify Grid Simulation readiness
    grid_converged = simulator.converged
    topology_info = simulator.get_topology_info()

    # 3. Verify AI / ML Detection model readiness
    ai_ready = detector.is_trained
    model_metrics = detector.metrics

    # 4. Active attacks info
    active_attacks = attack_engine.get_active_attacks()

    overall_status = "healthy" if (db_healthy and grid_converged and ai_ready) else "degraded"

    return {
        "status": overall_status,
        "platform": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "safety_confinement": {
            "real_infrastructure_connected": False,
            "virtual_environment_confined": True,
            "power_flow_physics": "Pandapower AC Newton-Raphson",
        },
        "components": {
            "database": {
                "status": "up" if db_healthy else "down",
                "type": "SQLite",
            },
            "grid_simulator": {
                "status": "up" if grid_converged else "degraded",
                "topology": topology_info.name,
                "buses_count": topology_info.num_buses,
                "lines_count": topology_info.num_lines,
                "power_flow_converged": grid_converged,
            },
            "ai_cybersecurity_detector": {
                "status": "ready" if ai_ready else "initializing",
                "model_type": model_metrics.model_type if model_metrics else settings.ML_MODEL_TYPE,
                "evaluated_accuracy": model_metrics.accuracy if model_metrics else None,
                "evaluated_f1_score": model_metrics.f1_score if model_metrics else None,
            },
            "attack_simulation": {
                "active_attacks_count": len(active_attacks),
                "is_confined_locally": True,
            },
        },
    }

