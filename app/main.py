"""
GridSentinel AI - Main FastAPI Application.
Cybersecurity platform for Smart Grids and Microgrids.
Strictly virtual simulation; no real electrical infrastructure connections.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import logger, setup_logging
from app.core.exceptions import (
    GridSentinelException,
    gridsentinel_exception_handler,
    generic_exception_handler,
)
from app.database.init_db import init_db
from app.api.v1.router import api_v1_router
from app.api.v1.websockets import router as websockets_router
from app.api.v1.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: sets up database and initializes components."""
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} (Env: {settings.APP_ENV})")
    
    # 1. Initialize SQLite database schema
    init_db()
    
    # 2. Confirm safety confinement
    logger.info("[SAFETY] GridSentinel is operating in Virtual Sandbox Mode. All electrical calculations run on Pandapower Newton-Raphson. No physical hardware connected.")

    # 3. Pre-warm WLS State Estimator baseline for IEEE 14-bus
    try:
        from app.api.dependencies import _state_estimator
        _state_estimator.estimate_state(scenario="normal")
        logger.info("[ESTIMATOR] Pre-warmed IEEE 14-bus WLS baseline state estimation.")
    except Exception as e:
        logger.warning(f"[ESTIMATOR] Initial baseline pre-warm warning: {e}")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "GridSentinel AI: Advanced Smart Grid & Microgrid Cybersecurity Detection Platform. "
            "Combines pandapower AC Newton-Raphson electrical power flow simulation, Scikit-learn "
            "AI/ML anomaly detection, virtual attack scenario injection, SQLite persistence, "
            "REST APIs, and live WebSocket streaming."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception Handlers
    app.add_exception_handler(GridSentinelException, gridsentinel_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Top-level direct health check (common for load balancers and orchestrators)
    app.include_router(health_router, prefix="")

    # API v1 Router
    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    # Real-time WebSockets Router
    app.include_router(websockets_router)

    @app.get("/", tags=["Root"])
    def root():
        return {
            "platform": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "operational",
            "documentation": "/docs",
            "health_check": "/health",
            "api_v1": settings.API_V1_PREFIX,
            "websockets": {
                "telemetry": "/ws/telemetry",
                "alerts": "/ws/alerts",
            },
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

