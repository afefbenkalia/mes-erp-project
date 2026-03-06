"""Service / logique métier pour la gestion des machines."""

from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .model import Machine, MachineStateHistory
from .schema import MachineCreate, MachineUpdate, StateHistoryCreate, StateHistoryUpdate


# ---------- Machines ----------

def get_machines(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    reference: Optional[str] = None,
    machine_type: Optional[str] = None,
) -> List[Machine]:
    """Liste les machines avec filtres optionnels."""
    q = db.query(Machine)
    if reference:
        q = q.filter(Machine.reference.ilike(f"%{reference}%"))
    if machine_type:
        q = q.filter(Machine.machine_type.ilike(f"%{machine_type}%"))
    return q.order_by(Machine.name).offset(skip).limit(limit).all()


def get_machine_by_id(db: Session, machine_id: int) -> Optional[Machine]:
    """Récupère une machine par ID."""
    return db.query(Machine).filter(Machine.id == machine_id).first()


def get_machine_by_reference(db: Session, reference: str) -> Optional[Machine]:
    """Récupère une machine par référence."""
    return db.query(Machine).filter(Machine.reference == reference).first()


def create_machine(db: Session, data: MachineCreate) -> Machine:
    """Crée une nouvelle machine."""
    machine = Machine(
        name=data.name,
        reference=data.reference,
        machine_type=data.machine_type,
        description=data.description,
        location=data.location,
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


def update_machine(db: Session, machine: Machine, data: MachineUpdate) -> Machine:
    """Met à jour une machine."""
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(machine, k, v)
    db.commit()
    db.refresh(machine)
    return machine


def delete_machine(db: Session, machine: Machine) -> None:
    """Supprime une machine (cascade sur l'historique)."""
    db.delete(machine)
    db.commit()


# ---------- État actuel ----------

def get_current_state(db: Session, machine_id: int) -> Optional[MachineStateHistory]:
    """Retourne l'état actuel de la machine (dernier état sans ended_at)."""
    return (
        db.query(MachineStateHistory)
        .filter(
            MachineStateHistory.machine_id == machine_id,
            MachineStateHistory.ended_at.is_(None),
        )
        .order_by(desc(MachineStateHistory.started_at))
        .first()
    )


# ---------- Historique des états ----------

def get_state_history(
    db: Session,
    machine_id: int,
    skip: int = 0,
    limit: int = 100,
    state: Optional[str] = None,
) -> List[MachineStateHistory]:
    """Liste l'historique des états d'une machine."""
    q = db.query(MachineStateHistory).filter(MachineStateHistory.machine_id == machine_id)
    if state:
        q = q.filter(MachineStateHistory.state == state)
    return q.order_by(desc(MachineStateHistory.started_at)).offset(skip).limit(limit).all()


def add_state_history(
    db: Session,
    machine_id: int,
    data: StateHistoryCreate,
) -> MachineStateHistory:
    """Ajoute une entrée à l'historique des états."""
    started = data.started_at or datetime.utcnow()
    entry = MachineStateHistory(
        machine_id=machine_id,
        state=data.state,
        started_at=started,
        ended_at=data.ended_at,
        comment=data.comment,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def close_current_state(
    db: Session,
    machine_id: int,
    ended_at: Optional[datetime] = None,
) -> Optional[MachineStateHistory]:
    """Clôture l'état actuel (met ended_at) et retourne l'entrée modifiée."""
    current = get_current_state(db, machine_id)
    if not current:
        return None
    current.ended_at = ended_at or datetime.utcnow()
    db.commit()
    db.refresh(current)
    return current


def update_state_history(
    db: Session,
    history_id: int,
    data: StateHistoryUpdate,
) -> Optional[MachineStateHistory]:
    """Met à jour une entrée d'historique."""
    entry = db.query(MachineStateHistory).filter(MachineStateHistory.id == history_id).first()
    if not entry:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


def change_state(
    db: Session,
    machine_id: int,
    new_state: str,
    comment: Optional[str] = None,
) -> MachineStateHistory:
    """
    Change l'état d'une machine :
    1. Clôture l'état actuel (ended_at = now)
    2. Crée une nouvelle entrée avec le nouvel état
    """
    now = datetime.utcnow()
    close_current_state(db, machine_id, ended_at=now)
    return add_state_history(
        db,
        machine_id,
        StateHistoryCreate(state=new_state, started_at=now, ended_at=None, comment=comment),
    )
