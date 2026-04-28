"""
Background aggregation task — runs every 60 seconds.

Drains the TelemetryCache buffer, computes per-machine min/avg/max for the
last minute, writes a single MachineTelemetryAggregate row per machine, then
refreshes the RuntimeCache so dashboard KPIs stay current.

Uses asyncio.to_thread so the blocking SQLAlchemy work never stalls the
ASGI event loop.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)


async def aggregation_loop() -> None:
    logger.info("[Aggregator] Started — tick every 60 s")
    while True:
        await asyncio.sleep(60)
        try:
            await asyncio.to_thread(_run_tick)
        except Exception:
            logger.exception("[Aggregator] Tick failed")


def _run_tick() -> None:
    from app.integrations.telemetry_cache import telemetry_cache
    from app.integrations.runtime_cache import runtime_cache
    from app.database import SessionLocal
    from app.modules.machines.model import Machine
    from .model import MachineTelemetryAggregate
    from app.core.datetime_utc import utc_now_naive

    now = utc_now_naive()
    period_start = now - timedelta(seconds=60)
    drained = telemetry_cache.drain_buffer()  # {machine_ref: [readings]}

    db = SessionLocal()
    try:
        written = 0
        for machine_ref, readings in drained.items():
            if not readings:
                continue
            machine = db.query(Machine).filter(Machine.reference == machine_ref).first()
            if not machine:
                continue

            def _vals(key: str) -> list[float]:
                return [float(r[key]) for r in readings if key in r and r[key] is not None]

            def _stats(lst: list[float]) -> tuple[float | None, float | None, float | None]:
                if not lst:
                    return None, None, None
                return round(sum(lst) / len(lst), 3), round(min(lst), 3), round(max(lst), 3)

            t_avg, t_min, t_max = _stats(_vals("temperature"))
            p_avg, p_min, p_max = _stats(_vals("pressure"))
            s_avg, s_min, s_max = _stats(_vals("speed"))
            v_avg, _, _          = _stats(_vals("vibration"))

            db.add(MachineTelemetryAggregate(
                machine_id=machine.id,
                resolution="minute",
                period_start=period_start,
                period_end=now,
                temperature_avg=t_avg, temperature_min=t_min, temperature_max=t_max,
                pressure_avg=p_avg,    pressure_min=p_min,    pressure_max=p_max,
                speed_avg=s_avg,       speed_min=s_min,       speed_max=s_max,
                vibration_avg=v_avg,
                sample_count=len(readings),
            ))
            written += 1

        db.commit()
        if written:
            logger.debug("[Aggregator] Wrote %d minute-buckets", written)

    except Exception:
        logger.exception("[Aggregator] DB write failed")
        db.rollback()
    finally:
        db.close()

    # Refresh runtime/downtime cache from DB (independent of whether we wrote anything)
    try:
        runtime_cache.refresh()
    except Exception:
        logger.exception("[Aggregator] RuntimeCache refresh failed")
