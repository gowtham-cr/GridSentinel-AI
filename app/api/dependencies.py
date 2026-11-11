"""Dependency injection for application singletons and database sessions."""

from typing import Generator
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.grid_simulation.simulator import GridSimulator
from app.attack_simulation.engine import AttackEngine
from app.telemetry.collector import TelemetryCollector
from app.cybersecurity.detector import GridCybersecurityDetector
from app.cybersecurity.mitigation import MitigationEngine
from app.grid_simulation.runner import SimulationManager
from app.estimation.state_estimator import StateEstimator
from app.coordinated_intelligence.service import CoordinatedIntelligenceService
from app.core.logging import logger

# Singleton engine instances
_grid_simulator = GridSimulator()
_attack_engine = AttackEngine(simulator=_grid_simulator)
_grid_simulator.attack_engine = _attack_engine
_telemetry_collector = TelemetryCollector(simulator=_grid_simulator)
_telemetry_collector.set_attack_engine(_attack_engine)
_cybersecurity_detector = GridCybersecurityDetector()
_mitigation_engine = MitigationEngine(
    simulator=_grid_simulator,
    attack_engine=_attack_engine,
    collector=_telemetry_collector,
)
_simulation_manager = SimulationManager(
    simulator=_grid_simulator,
    collector=_telemetry_collector,
)
_state_estimator = StateEstimator(simulator=_grid_simulator)
_state_estimator.set_attack_engine(_attack_engine)
_coordinated_intelligence_service = CoordinatedIntelligenceService(
    simulator=_grid_simulator,
    collector=_telemetry_collector,
)


def get_grid_simulator() -> GridSimulator:
    """Dependency providing singleton pandapower GridSimulator."""
    return _grid_simulator


def get_attack_engine() -> AttackEngine:
    """Dependency providing singleton AttackEngine."""
    return _attack_engine


def get_telemetry_collector() -> TelemetryCollector:
    """Dependency providing singleton TelemetryCollector."""
    return _telemetry_collector


def get_cybersecurity_detector() -> GridCybersecurityDetector:
    """Dependency providing singleton GridCybersecurityDetector."""
    return _cybersecurity_detector


def get_mitigation_engine() -> MitigationEngine:
    """Dependency providing singleton MitigationEngine."""
    return _mitigation_engine


def get_simulation_manager() -> SimulationManager:
    """Dependency providing singleton SimulationManager."""
    return _simulation_manager


def get_state_estimator() -> StateEstimator:
    """Dependency providing singleton StateEstimator."""
    return _state_estimator


def get_coordinated_intelligence_service() -> CoordinatedIntelligenceService:
    """Dependency providing singleton CoordinatedIntelligenceService."""
    return _coordinated_intelligence_service


def get_db() -> Generator[Session, None, None]:
    """Dependency for providing a transactional SQLite session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Re-export authentication dependency for convenient endpoint protection
from app.api.v1.auth import get_current_operator

