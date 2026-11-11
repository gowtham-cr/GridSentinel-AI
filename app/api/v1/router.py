"""API v1 consolidated router aggregating all domain sub-routers."""

from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.grid import router as grid_router
from app.api.v1.telemetry import router as telemetry_router
from app.api.v1.attacks import router as attacks_router
from app.api.v1.cybersecurity import router as cybersecurity_router
from app.api.v1.auth import router as auth_router
from app.api.v1.estimation import router as estimation_router
from app.api.v1.coordinated_intelligence import router as coordinated_intelligence_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(health_router)
api_v1_router.include_router(grid_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(attacks_router)
api_v1_router.include_router(cybersecurity_router)
api_v1_router.include_router(estimation_router)
api_v1_router.include_router(coordinated_intelligence_router)

