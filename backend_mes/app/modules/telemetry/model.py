"""ORM model for aggregated machine telemetry.

Raw sensor readings are never stored — only 1-minute aggregates written
by the background aggregation task. This is the only new DB table in the
telemetry architecture; all live data stays in the in-memory cache.
"""
from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String

from app.core.datetime_utc import utc_now_naive
from app.database import Base


class MachineTelemetryAggregate(Base):
    __tablename__ = "machine_telemetry_aggregates"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    machine_id   = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    resolution   = Column(String(10), nullable=False)   # 'minute' | 'hour' | 'day'
    period_start = Column(DateTime,   nullable=False)
    period_end   = Column(DateTime,   nullable=False)

    temperature_avg = Column(Float, nullable=True)
    temperature_min = Column(Float, nullable=True)
    temperature_max = Column(Float, nullable=True)

    pressure_avg = Column(Float, nullable=True)
    pressure_min = Column(Float, nullable=True)
    pressure_max = Column(Float, nullable=True)

    speed_avg = Column(Float, nullable=True)
    speed_min = Column(Float, nullable=True)
    speed_max = Column(Float, nullable=True)

    vibration_avg = Column(Float, nullable=True)
    sample_count  = Column(Integer, nullable=False, default=0)
    created_at    = Column(DateTime, nullable=False, default=utc_now_naive)

    __table_args__ = (
        Index(
            "ix_telemetry_agg_lookup",
            "machine_id", "resolution", "period_start",
        ),
    )
