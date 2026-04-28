"""ORM models for machines and state history."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.datetime_utc import utc_now_naive
from app.database import Base


class MachineStateEnum:
    MARCHE      = "MARCHE"
    PAUSE       = "PAUSE"
    ERREUR      = "ERREUR"
    MAINTENANCE = "MAINTENANCE"


class Machine(Base):
    __tablename__ = "machines"

    id           = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name         = Column(String(100), nullable=False, index=True)
    reference    = Column(String(80),  nullable=False, index=True)
    machine_type = Column(String(80),  nullable=False)
    description  = Column(String(500), nullable=True)
    location     = Column(String(120), nullable=True)
    created_at   = Column(DateTime, default=utc_now_naive)
    updated_at   = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    # ── audit log of all state transitions (many rows per machine) ──
    state_history = relationship(
        "MachineStateHistory",
        back_populates="machine",
        cascade="all, delete-orphan",
        order_by="desc(MachineStateHistory.started_at)",
        lazy="select",
    )

    # ── live single-row current state (1:1) ──
    operational_status = relationship(
        "MachineOperationalStatus",
        back_populates="machine",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="select",
    )

    # ── maintenance records ──
    interventions = relationship(
        "MaintenanceIntervention",
        back_populates="machine",
        cascade="all, delete-orphan",
        order_by="desc(MaintenanceIntervention.start_time)",
        lazy="select",
    )
    maintenance_history = relationship(
        "MaintenanceHistory",
        back_populates="machine",
        cascade="all, delete-orphan",
        order_by="desc(MaintenanceHistory.date)",
        lazy="select",
    )
    preventive_plans = relationship(
        "PreventiveMaintenance",
        back_populates="machine",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self):
        return f"<Machine(id={self.id}, name='{self.name}', ref='{self.reference}')>"


class MachineStateHistory(Base):
    """Full audit log of every state transition for a machine."""

    __tablename__ = "machine_state_history"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)
    state      = Column(String(20),  nullable=False)   # MARCHE | PAUSE | ERREUR | MAINTENANCE
    started_at = Column(DateTime,    nullable=False)
    ended_at   = Column(DateTime,    nullable=True)    # NULL = state currently active
    comment    = Column(String(500), nullable=True)
    changed_by = Column(String(120), nullable=True)    # email / username of actor
    created_at = Column(DateTime, default=utc_now_naive)

    machine = relationship("Machine", back_populates="state_history")

    def __repr__(self):
        return (
            f"<MachineStateHistory(id={self.id}, machine_id={self.machine_id}, "
            f"state='{self.state}', {self.started_at}→{self.ended_at})>"
        )
