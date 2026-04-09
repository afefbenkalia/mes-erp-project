"""Helpers for UTC instants stored as naive datetimes (PostgreSQL TIMESTAMP WITHOUT TIME ZONE)."""

from __future__ import annotations

from datetime import datetime, timezone


def utc_now_naive() -> datetime:
    """Wall-clock UTC as naive datetime, safe for TIMESTAMP WITHOUT TIME ZONE columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_z_iso(dt: datetime | None) -> str | None:
    """
    Serialize for JSON so clients parse as UTC (suffix Z).
    Naive values are treated as UTC (matches utc_now_naive storage).
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")
