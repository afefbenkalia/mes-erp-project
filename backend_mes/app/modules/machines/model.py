"""Modèles ORM pour la gestion des machines et de l'historique des états."""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy import Float
from app.core.datetime_utc import utc_now_naive
from sqlalchemy.orm import relationship

try:
    from app.database import Base
except ImportError:
    from ...core.database import Base


class MachineStateEnum:
    """États possibles d'une machine."""
    MARCHE = "MARCHE"
    PAUSE = "PAUSE"
    ERREUR = "ERREUR"
    MAINTENANCE = "MAINTENANCE"


class Machine(Base):
    """Machine industrielle avec informations de base."""

    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, index=True)
    reference = Column(String(80), nullable=False, index=True)
    machine_type = Column(String(80), nullable=False)
    description = Column(String(500))
    location = Column(String(120))
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

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
    """Historique des états d'une machine (MARCHE, PAUSE, ERREUR, MAINTENANCE)."""

    __tablename__ = "machine_state_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)

    state = Column(String(20), nullable=False)  # MARCHE, PAUSE, ERREUR, MAINTENANCE
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)  # None = état en cours
    comment = Column(String(500))
    changed_by = Column(String(120), nullable=True)  # email/nom de l'acteur

    created_at = Column(DateTime, default=utc_now_naive)

    # Relation
    machine = relationship("Machine", back_populates="state_history")

    def __repr__(self):
        return f"<MachineStateHistory(id={self.id}, machine_id={self.machine_id}, state='{self.state}', {self.started_at}->{self.ended_at})>"
class MachineData(Base):
    """Données temps réel des machines (simulation ou IoT)."""

    __tablename__ = "machine_data"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False, index=True)

    timestamp = Column(DateTime, default=utc_now_naive, index=True)

    state = Column(String(20))
    temperature = Column(Float)
    speed = Column(Integer)
    vibration = Column(Float)
    production = Column(Integer)

    machine = relationship("Machine")

    def __repr__(self):
        return f"<MachineData(machine_id={self.machine_id}, temp={self.temperature}, speed={self.speed})>"