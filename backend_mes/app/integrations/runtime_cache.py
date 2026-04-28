"""
Periodic DB-backed cache for machine runtime / downtime minutes.

Updated every 60 seconds by the aggregation task — not on every MQTT message —
so dashboard KPIs are always current without hammering the database.
"""
import logging
import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_

logger = logging.getLogger(__name__)


class _RuntimeCache:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # {machine_ref: {"runtime_minutes": float, "downtime_minutes": float}}
        self._data: dict[str, dict] = {}

    def get(self, machine_ref: str) -> dict:
        with self._lock:
            return dict(self._data.get(machine_ref, {"runtime_minutes": 0.0, "downtime_minutes": 0.0}))

    def refresh(self) -> None:
        """Recompute runtime/downtime for all machines over the last 24 h."""
        from app.database import SessionLocal
        from app.modules.machines.model import Machine, MachineStateHistory

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            since = now - timedelta(hours=24)
            window_seconds = (now - since).total_seconds()

            machines = db.query(Machine).all()
            new_data: dict[str, dict] = {}

            for m in machines:
                # Fetch every row that overlaps the 24-h window — including open
                # entries that started before `since`. Rows closed before the
                # window (ended_at < since) are safely excluded.
                history = (
                    db.query(MachineStateHistory)
                    .filter(
                        MachineStateHistory.machine_id == m.id,
                        or_(
                            MachineStateHistory.ended_at.is_(None),
                            MachineStateHistory.ended_at >= since,
                        ),
                    )
                    .all()
                )
                marche_seconds = 0.0
                for h in history:
                    if h.state != "MARCHE":
                        continue
                    # Clip to the window — a state that started before `since`
                    # only contributes from `since` onward, not from its full start.
                    start = max(h.started_at, since)
                    end = h.ended_at or now
                    marche_seconds += max(0.0, (end - start).total_seconds())

                new_data[m.reference] = {
                    "runtime_minutes": round(marche_seconds / 60, 1),
                    "downtime_minutes": round((window_seconds - marche_seconds) / 60, 1),
                }

            with self._lock:
                self._data = new_data

            logger.debug("[RuntimeCache] Refreshed %d machines", len(new_data))
        except Exception:
            logger.exception("[RuntimeCache] Refresh failed")
        finally:
            db.close()


runtime_cache = _RuntimeCache()
