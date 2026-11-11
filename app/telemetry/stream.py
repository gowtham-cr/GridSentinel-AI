"""WebSocket connection manager for real-time telemetry and cybersecurity alert streaming."""

import asyncio
from typing import List, Set
from fastapi import WebSocket
from app.core.logging import logger


class StreamManager:
    """Manages active WebSocket connections for low-latency telemetry streaming."""

    def __init__(self, name: str = "StreamManager"):
        self.name = name
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accepts and registers incoming WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.debug(f"[{self.name}] Client connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        """Removes a closed WebSocket connection."""
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.debug(f"[{self.name}] Client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast_json(self, payload: dict) -> None:
        """Broadcasts a JSON-serializable dictionary to all connected clients."""
        if not self.active_connections:
            return

        stale_connections = []
        async with self._lock:
            current_connections = list(self.active_connections)

        for connection in current_connections:
            try:
                await connection.send_json(payload)
            except Exception as e:
                logger.debug(f"[{self.name}] Error transmitting to client ({e}); marking for removal.")
                stale_connections.append(connection)

        if stale_connections:
            async with self._lock:
                for dead_conn in stale_connections:
                    self.active_connections.discard(dead_conn)

    @property
    def client_count(self) -> int:
        return len(self.active_connections)


# Global instances for telemetry and security alerts
telemetry_stream_manager = StreamManager(name="TelemetryStream")
alert_stream_manager = StreamManager(name="SecurityAlertStream")

