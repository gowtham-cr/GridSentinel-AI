"""
API Endpoints for Coordinated Threat Intelligence Engine (CTIE).
Provides independent graph-temporal anomaly correlation, scenario analysis,
and model status reporting.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import (
    get_db,
    get_coordinated_intelligence_service,
)
from app.coordinated_intelligence.service import CoordinatedIntelligenceService
from app.coordinated_intelligence.schemas import (
    CoordinatedIncidentReport,
    ModelStatusResponse,
    CustomAnalysisRequest,
)

router = APIRouter(prefix="/coordinated-intelligence", tags=["Coordinated Threat Intelligence"])


@router.post("/analyze", response_model=CoordinatedIncidentReport)
def analyze_live_grid_threats(
    window_seconds: float = Query(15.0, ge=1.0, le=120.0, description="Sliding correlation time window in seconds"),
    service: CoordinatedIntelligenceService = Depends(get_coordinated_intelligence_service),
    db: Session = Depends(get_db),
):
    """
    Evaluates live digital twin telemetry using the Graph-Based Temporal Anomaly Correlation Model.
    Correlates spatial graph distance, temporal synchronization, and cross-modal evidence.
    """
    return service.analyze_live_state(db=db, window_seconds=window_seconds)


@router.post("/analyze-scenario", response_model=CoordinatedIncidentReport)
def analyze_scenario_threats(
    req: CustomAnalysisRequest,
    service: CoordinatedIntelligenceService = Depends(get_coordinated_intelligence_service),
    db: Session = Depends(get_db),
):
    """
    Evaluates a specific or simulated set of multi-component anomaly observations.
    Useful for testing reproducible coordinated multi-point attacks or negative control scenarios.
    """
    return service.analyze_custom_scenario(
        observations=req.observations,
        window_seconds=req.window_seconds,
        db=db,
    )


@router.get("/model-status", response_model=ModelStatusResponse)
def get_ctie_model_status(
    service: CoordinatedIntelligenceService = Depends(get_coordinated_intelligence_service),
):
    """
    Returns CTIE model architecture parameters, active topology graph size,
    and transparency disclaimers.
    """
    return service.get_model_status()


@router.get("/graph-topology", response_model=Dict[str, Any])
def get_graph_topology(
    service: CoordinatedIntelligenceService = Depends(get_coordinated_intelligence_service),
):
    """
    Returns the active electrical graph topology (nodes, edges, admittances, branch types)
    for interactive D3/SVG frontend visualization.
    """
    return service.get_graph_topology()


@router.get("/incidents", response_model=List[Dict[str, Any]])
def get_coordinated_incidents(
    limit: int = Query(50, ge=1, le=200, description="Maximum number of historical coordinated incidents to return"),
    service: CoordinatedIntelligenceService = Depends(get_coordinated_intelligence_service),
    db: Session = Depends(get_db),
):
    """
    Retrieves chronological coordinated threat incident records persisted in SQLite.
    """
    return service.get_coordinated_incidents(db=db, limit=limit)

