"""WebSocket connection manager for maintenance events."""

import json
from typing import Any

from fastapi import WebSocket


class MaintenanceConnectionManager:
    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)

    async def broadcast(self, event: str, payload: dict[str, Any]) -> None:
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        dead_connections: list[WebSocket] = []
        for connection in self._connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)
        for connection in dead_connections:
            self.disconnect(connection)


maintenance_ws_manager = MaintenanceConnectionManager()
