"""ORM models for maintenance workflow."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.datetime_utc import utc_now_naive
from app.database import Base


class MachineOperationalState:
    """Allowed machine states for maintenance dashboard."""

    MARCHE = "MARCHE"
    PAUSE = "PAUSE"
    ERREUR = "ERREUR"
    MAINTENANCE = "MAINTENANCE"

    @classmethod
    def values(cls) -> set[str]:
        return {cls.MARCHE, cls.PAUSE, cls.ERREUR, cls.MAINTENANCE}


class MaintenanceInterventionStatus:
    EN_MAINTENANCE = "EN_MAINTENANCE"
    REPAIREE = "REPAIREE"


class MachineOperationalStatus(Base):
    __tablename__ = "machine_operational_status"

    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), primary_key=True, index=True)
    state = Column(String(20), nullable=False, default=MachineOperationalState.MARCHE, index=True)
    last_update = Column(DateTime, nullable=False, default=utc_now_naive, onupdate=utc_now_naive)

    machine = relationship("Machine")


class MaintenanceIntervention(Base):
    __tablename__ = "maintenance_interventions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    technician = Column(String(120), nullable=False, default="Responsable de Maintenance")
    status = Column(String(40), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, default=utc_now_naive)
    end_time = Column(DateTime, nullable=True)
    action_effectuee = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now_naive)
    updated_at = Column(DateTime, nullable=False, default=utc_now_naive, onupdate=utc_now_naive)

    machine = relationship("Machine")


class MaintenanceHistory(Base):
    __tablename__ = "maintenance_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    technician = Column(String(120), nullable=False, default="Responsable de Maintenance")
    duration_seconds = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=False, default=utc_now_naive, index=True)
    action_effectuee = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now_naive)

    machine = relationship("Machine")


class PreventiveMaintenance(Base):
    __tablename__ = "preventive_maintenance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    planned_date = Column(DateTime, nullable=True, index=True)
    maintenance_type = Column(String(120), nullable=False)
    trigger_mode = Column(String(20), nullable=False, default="SCHEDULED", index=True)
    runtime_threshold_minutes = Column(Integer, nullable=True)
    last_triggered_at = Column(DateTime, nullable=True)
    status = Column(String(40), nullable=False, default="PLANIFIE", index=True)
    created_at = Column(DateTime, nullable=False, default=utc_now_naive)
    updated_at = Column(DateTime, nullable=False, default=utc_now_naive, onupdate=utc_now_naive)

    machine = relationship("Machine")
