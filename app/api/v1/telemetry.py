"""Telemetry REST API endpoints."""

from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.api.dependencies import get_telemetry_collector, get_db
from app.telemetry.collector import TelemetryCollector
from app.telemetry.schemas import TelemetryPacket
from app.database.models import TelemetryLog

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.get("/latest", response_model=TelemetryPacket)
def get_latest_telemetry(collector: TelemetryCollector = Depends(get_telemetry_collector)):
    """Returns the most recent PMU/SCADA telemetry sample."""
    return collector.get_latest()


@router.get("/history", response_model=List[TelemetryPacket])
def get_telemetry_history(
    limit: int = Query(30, ge=1, le=200, description="Number of recent telemetry packets to return"),
    collector: TelemetryCollector = Depends(get_telemetry_collector),
):
    """Returns recent historical buffer of telemetry packets."""
    return collector.get_history(limit=limit)


@router.post("/sample", response_model=TelemetryPacket)
def sample_and_record_telemetry(
    collector: TelemetryCollector = Depends(get_telemetry_collector),
    db: Session = Depends(get_db),
):
    """
    Triggers an on-demand telemetry acquisition cycle and persists records to SQLite.
    """
    packet = collector.sample_telemetry()
    
    # Persist bus readings to database
    for bus in packet.buses:
        log_entry = TelemetryLog(
            bus_id=bus.bus_id,
            vm_pu=bus.vm_pu,
            va_degree=bus.va_degree,
            p_mw=bus.p_mw,
            q_mvar=bus.q_mvar,
            is_compromised=bus.is_spoofed,
            attack_tag=",".join(packet.active_attack_vectors) if packet.active_attack_vectors else None,
        )
        db.add(log_entry)
    
    db.commit()
    return packet

