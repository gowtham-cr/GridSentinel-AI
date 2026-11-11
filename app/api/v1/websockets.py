"""WebSocket endpoints for real-time telemetry streaming and live cybersecurity alerts."""

import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.dependencies import (
    get_telemetry_collector,
    get_cybersecurity_detector,
    get_grid_simulator,
)
from app.telemetry.stream import telemetry_stream_manager, alert_stream_manager
from app.core.logging import logger

router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws/telemetry")
@router.websocket("/api/v1/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    """
    WebSocket endpoint streaming live PMU/SCADA microgrid telemetry and Pandapower power-flow calculations.
    Streams telemetry packets and calculated electrical states at regular 1 Hz intervals.
    """
    await telemetry_stream_manager.connect(websocket)
    collector = get_telemetry_collector()
    simulator = get_grid_simulator()

    try:
        while True:
            # Advance simulation slightly to show continuous microgrid physics
            simulator.step(load_noise_std=0.01, der_variation=0.015)
            packet = collector.sample_telemetry()
            state_summary = simulator.get_state_summary()
            
            payload = {
                "type": "TELEMETRY_STREAM",
                "telemetry": packet.model_dump(),
                "grid_state": state_summary.model_dump(),
            }
            await websocket.send_json(payload)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        await telemetry_stream_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"Telemetry WebSocket closed or error: {e}")
        await telemetry_stream_manager.disconnect(websocket)


@router.websocket("/ws/alerts")
@router.websocket("/api/v1/ws/alerts")
async def websocket_alerts_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time cybersecurity incident alert notifications.
    Pushes structured incident reports immediately when AI detector detects an attack.
    """
    await alert_stream_manager.connect(websocket)
    try:
        while True:
            # Keep connection open waiting for broadcasts from alert_stream_manager
            # or client ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await alert_stream_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"Alerts WebSocket closed or error: {e}")
        await alert_stream_manager.disconnect(websocket)

