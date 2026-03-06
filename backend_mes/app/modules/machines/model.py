"""Modèles ORM pour la gestion des machines et de l'historique des états."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

try:
    from app.core.database import Base
except ImportError:
    from ...core.database import Base


class MachineStateEnum:
    """États possibles d'une machine."""
    RUNNING = "running"      # En marche
    STOPPED = "stopped"      # À l'arrêt
    FAILURE = "failure"      # En panne


class Machine(Base):
    """Machine industrielle avec informations de base."""

    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    reference = Column(String(80), nullable=False, unique=True, index=True)
    machine_type = Column(String(80), nullable=False)
    description = Column(String(500))
    location = Column(String(120))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relation: historique des états
    state_history = relationship(
        "MachineStateHistory",
        back_populates="machine",
        cascade="all, delete-orphan",
        order_by="desc(MachineStateHistory.started_at)",
    )

    def __repr__(self):
        return f"<Machine(id={self.id}, name='{self.name}', ref='{self.reference}')>"


class MachineStateHistory(Base):
    """Historique des états d'une machine (marche, arrêt, panne)."""

    __tablename__ = "machine_state_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)

    state = Column(String(20), nullable=False)  # running, stopped, failure
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)  # None = état en cours
    comment = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relation
    machine = relationship("Machine", back_populates="state_history")

    def __repr__(self):
        return f"<MachineStateHistory(id={self.id}, machine_id={self.machine_id}, state='{self.state}', {self.started_at}->{self.ended_at})>"
