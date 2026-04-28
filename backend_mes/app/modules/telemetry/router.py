"""
Telemetry API — WebSocket stream + REST snapshots.

WebSocket  ws://localhost:8000/api/telemetry/stream
  • Sends a snapshot of all currently cached readings on connect.
  • Pushes enriched machine payloads as they arrive from MQTT.
  • Payload always includes machineId (= machine_reference) and real
    runtime_minutes / downtime_minutes from the RuntimeCache.

REST
  GET /api/telemetry/current          → latest reading for every machine
  GET /api/telemetry/{id}/history     → aggregated history from PostgreSQL
"""
import asyncio
import json
import logging
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.database import get_db
from app.integrations.runtime_cache import runtime_cache
from app.integrations.telemetry_cache import telemetry_cache
from app.modules.machines.model import Machine

from .model import MachineTelemetryAggregate

router = APIRouter(prefix="/telemetry", tags=["telemetry"])
logger = logging.getLogger(__name__)

_MACHINE_TOPIC_RE = re.compile(r"^mes/machines/[^/]+/data$|^mes/[^/]+/machines/[^/]+/telemetry$")
_GLOBAL_TOPIC = "mes/metrics/global"

# ── WebSocket hub (module-level, single process) ──────────────────────────────
_clients: set[WebSocket] = set()


def _enrich(machine_ref: str, payload: dict) -> dict:
    """Add machineId alias + DB-backed runtime/downtime to a raw MQTT payload."""
    rt = runtime_cache.get(machine_ref)
    return {
        **payload,
        "machineId": machine_ref,       # fixes the machine_reference → machineId mismatch
        "runtime_minutes": rt["runtime_minutes"],
        "downtime_minutes": rt["downtime_minutes"],
        "_type": "machine",
    }


async def broadcast_telemetry(topic: str, payload: dict) -> None:
    """
    Called by the MQTT consumer thread via asyncio.run_coroutine_threadsafe.
    Enriches the payload and fans it out to all connected WebSocket clients.
    """
    machine_ref = payload.get("machine_reference", "")

    if _MACHINE_TOPIC_RE.match(topic) and machine_ref:
        msg = json.dumps(_enrich(machine_ref, payload))
    elif topic == _GLOBAL_TOPIC:
        msg = json.dumps({**payload, "_type": "global"})
    else:
        return

    dead: set[WebSocket] = set()
    for ws in set(_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/stream")
async def telemetry_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    _clients.add(websocket)

    # Send a full snapshot so the dashboard is populated immediately on connect
    for machine_ref, payload in telemetry_cache.get_all_latest().items():
        try:
            await websocket.send_text(json.dumps(_enrich(machine_ref, payload)))
        except Exception:
            _clients.discard(websocket)
            return

    try:
        while True:
            await websocket.receive_text()   # keep alive / accept client pings
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)


# ── REST endpoints ────────────────────────────────────────────────────────────

@router.get("/current")
def get_current_telemetry():
    """Latest enriched telemetry for every machine currently in the cache."""
    snapshot = telemetry_cache.get_all_latest()
    return [_enrich(ref, payload) for ref, payload in snapshot.items()]


@router.get("/{machine_id}/history")
def get_telemetry_history(
    machine_id: int,
    resolution: str = Query("minute", pattern="^(minute|hour|day)$"),
    limit: int = Query(60, ge=1, le=1440),
    db: Session = Depends(get_db),
):
    """Aggregated telemetry history (min/avg/max per bucket) from PostgreSQL."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    rows = (
        db.query(MachineTelemetryAggregate)
        .filter(
            MachineTelemetryAggregate.machine_id == machine_id,
            MachineTelemetryAggregate.resolution == resolution,
        )
        .order_by(MachineTelemetryAggregate.period_start.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "period_start":    r.period_start.isoformat() if r.period_start else None,
            "period_end":      r.period_end.isoformat()   if r.period_end   else None,
            "temperature_avg": r.temperature_avg, "temperature_min": r.temperature_min, "temperature_max": r.temperature_max,
            "pressure_avg":    r.pressure_avg,    "pressure_min":    r.pressure_min,    "pressure_max":    r.pressure_max,
            "speed_avg":       r.speed_avg,       "speed_min":       r.speed_min,       "speed_max":       r.speed_max,
            "vibration_avg":   r.vibration_avg,
            "sample_count":    r.sample_count,
        }
        for r in rows
    ]
