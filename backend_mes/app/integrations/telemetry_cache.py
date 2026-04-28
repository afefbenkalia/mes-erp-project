"""
Thread-safe in-memory store for live machine telemetry.

Two roles:
  latest   — the most recent reading per machine_ref (dashboard snapshot)
  buffer   — accumulation of all readings between aggregation ticks (drained every 60 s)
"""
import threading
from datetime import datetime, timezone


class _TelemetryCache:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._latest: dict[str, dict] = {}
        self._buffer: dict[str, list[dict]] = {}

    def update(self, machine_ref: str, payload: dict) -> None:
        enriched = {
            **payload,
            "received_at": datetime.now(timezone.utc).isoformat(),
        }
        with self._lock:
            self._latest[machine_ref] = enriched
            self._buffer.setdefault(machine_ref, []).append(enriched)

    def get_latest(self, machine_ref: str) -> dict | None:
        with self._lock:
            raw = self._latest.get(machine_ref)
            return dict(raw) if raw else None

    def get_all_latest(self) -> dict[str, dict]:
        with self._lock:
            return {k: dict(v) for k, v in self._latest.items()}

    def drain_buffer(self) -> dict[str, list[dict]]:
        """Atomically clear and return all buffered readings for aggregation."""
        with self._lock:
            drained = {k: list(v) for k, v in self._buffer.items()}
            self._buffer.clear()
            return drained


telemetry_cache = _TelemetryCache()
