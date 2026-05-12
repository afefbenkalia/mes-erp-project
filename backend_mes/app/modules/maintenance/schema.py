"""Pydantic schemas for maintenance dashboard."""

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator, model_validator

from app.core.datetime_utc import to_utc_z_iso


def _naive_utc(v: Optional[datetime]) -> Optional[datetime]:
    """Strip timezone info by converting to UTC first (matches utc_now_naive storage)."""
    if v is None:
        return None
    if v.tzinfo is not None:
        return v.astimezone(timezone.utc).replace(tzinfo=None)
    return v


class MachineStatusResponse(BaseModel):
    machine_id: int
    machine_reference: str
    machine_name: str
    state: str
    last_update: datetime

    @field_serializer("last_update")
    def _serialize_last_update(self, value: datetime) -> str:
        return to_utc_z_iso(value) or ""


class InterventionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    machine_id: int
    technician: str
    status: str
    start_time: datetime
    end_time: Optional[datetime]
    action_effectuee: Optional[str]

    @field_serializer("start_time", "end_time")
    def _serialize_datetimes(self, value: Optional[datetime]) -> Optional[str]:
        return to_utc_z_iso(value)


class MaintenanceHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    machine_id: int
    technician: str
    duration_seconds: int
    date: datetime
    action_effectuee: str

    @field_serializer("date")
    def _serialize_date(self, value: datetime) -> str:
        return to_utc_z_iso(value) or ""


class HandleErrorRequest(BaseModel):
    technician: str = Field(default="Responsable de Maintenance", min_length=1, max_length=120)


class MarkRepairedRequest(BaseModel):
    action_effectuee: str = Field(..., min_length=1, max_length=2000)
    technician: str = Field(default="Responsable de Maintenance", min_length=1, max_length=120)


class SimulationErrorRequest(BaseModel):
    machine_id: Optional[int] = None
    machine_reference: Optional[str] = None


class PreventiveMaintenanceCreate(BaseModel):
    machine_id: int
    planned_date: Optional[datetime] = None
    maintenance_type: str = Field(..., min_length=1, max_length=120)
    trigger_mode: str = Field(default="SCHEDULED", pattern="^(SCHEDULED|RUNTIME)$")
    runtime_threshold_minutes: Optional[int] = Field(default=None, ge=1)
    status: str = Field(default="PLANIFIE", pattern="^(PLANIFIE|EN COURS|TERMINE)$")

    @field_validator("planned_date", mode="after")
    @classmethod
    def _normalize_planned_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        return _naive_utc(v)

    @model_validator(mode="after")
    def _validate_trigger_fields(self):
        if self.trigger_mode == "SCHEDULED" and self.planned_date is None:
            raise ValueError("planned_date requis pour trigger_mode=SCHEDULED")
        if self.trigger_mode == "RUNTIME" and self.runtime_threshold_minutes is None:
            raise ValueError("runtime_threshold_minutes requis pour trigger_mode=RUNTIME")
        return self


class PreventiveMaintenanceUpdate(BaseModel):
    planned_date: Optional[datetime] = None
    maintenance_type: Optional[str] = Field(default=None, min_length=1, max_length=120)
    trigger_mode: Optional[str] = Field(default=None, pattern="^(SCHEDULED|RUNTIME)$")
    runtime_threshold_minutes: Optional[int] = Field(default=None, ge=1)
    status: Optional[str] = Field(default=None, pattern="^(PLANIFIE|EN COURS|TERMINE)$")

    @field_validator("planned_date", mode="after")
    @classmethod
    def _normalize_planned_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        return _naive_utc(v)

    @model_validator(mode="after")
    def _validate_trigger_fields(self):
        if self.trigger_mode == "SCHEDULED" and self.runtime_threshold_minutes is not None:
            raise ValueError("runtime_threshold_minutes non autorise pour trigger_mode=SCHEDULED")
        if self.trigger_mode == "RUNTIME" and self.planned_date is not None:
            raise ValueError("planned_date non autorise pour trigger_mode=RUNTIME")
        return self


class PreventiveMaintenanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    machine_id: int
    planned_date: Optional[datetime]
    maintenance_type: str
    trigger_mode: str
    runtime_threshold_minutes: Optional[int]
    last_triggered_at: Optional[datetime]
    status: str

    @field_serializer("planned_date", "last_triggered_at")
    def _serialize_planned_date(self, value: Optional[datetime]) -> Optional[str]:
        return to_utc_z_iso(value)
