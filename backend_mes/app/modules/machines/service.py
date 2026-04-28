"""Service / logique métier pour la gestion des machines."""

from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.datetime_utc import utc_now_naive
from app.modules.maintenance.model import MachineOperationalState, MachineOperationalStatus

from .model import Machine, MachineStateEnum, MachineStateHistory
from .schema import MachineCreate, MachineUpdate, StateHistoryCreate, StateHistoryUpdate

_LEGACY_STATE_MAP = {
    "running": MachineOperationalState.MARCHE,
    "stopped": MachineOperationalState.PAUSE,
    "pause": MachineOperationalState.PAUSE,
    "error": MachineOperationalState.ERREUR,
    "failure": MachineOperationalState.ERREUR,
    "maintenance": MachineOperationalState.MAINTENANCE,
}


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

    now = utc_now_naive()

    # Keep maintenance and machine modules aligned from creation time.
    status = MachineOperationalStatus(
        machine_id=machine.id,
        state=MachineOperationalState.MARCHE,
        last_update=now,
    )
    db.add(status)

    # Seed the initial open MARCHE history entry so runtime_cache can track time
    # from the very first moment. Without this row, change_state() has no open
    # entry to close, the initial MARCHE span is never recorded, and runtime
    # stays 0 until a complete PAUSE→MARCHE cycle has been recorded.
    initial_history = MachineStateHistory(
        machine_id=machine.id,
        state=MachineStateEnum.MARCHE,
        started_at=now,
        ended_at=None,
        changed_by="system",
    )
    db.add(initial_history)
    db.commit()
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


def normalize_legacy_machine_states(db: Session) -> int:
    """
    One-time normalization to enforce uppercase machine states in DB.
    Returns number of updated rows.
    """
    updated = 0

    statuses = db.query(MachineOperationalStatus).all()
    for status in statuses:
        normalized = _LEGACY_STATE_MAP.get(str(status.state or "").strip().lower())
        if normalized and status.state != normalized:
            status.state = normalized
            updated += 1

    history_rows = db.query(MachineStateHistory).all()
    for row in history_rows:
        normalized = _LEGACY_STATE_MAP.get(str(row.state or "").strip().lower())
        if normalized and row.state != normalized:
            row.state = normalized
            updated += 1

    if updated:
        db.commit()
    return updated


# ---------- État actuel ----------

def _ensure_operational_status(db: Session, machine_id: int) -> MachineOperationalStatus:
    status = (
        db.query(MachineOperationalStatus)
        .filter(MachineOperationalStatus.machine_id == machine_id)
        .first()
    )
    if status:
        return status

    status = MachineOperationalStatus(
        machine_id=machine_id,
        state=MachineOperationalState.MARCHE,
        last_update=utc_now_naive(),
    )
    db.add(status)
    db.commit()
    db.refresh(status)
    return status

def get_current_state(db: Session, machine_id: int) -> Optional[MachineStateHistory]:
    """Retourne l'état actuel depuis la source partagée maintenance."""
    status = _ensure_operational_status(db, machine_id)
    return MachineStateHistory(
        machine_id=machine_id,
        state=status.state,
        started_at=status.last_update,
        ended_at=None,
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
    changed_by: Optional[str] = None,
) -> MachineStateHistory:
    """Ajoute une entrée à l'historique des états et synchronise l'état courant."""
    started = data.started_at or utc_now_naive()
    entry = MachineStateHistory(
        machine_id=machine_id,
        state=data.state,
        started_at=started,
        ended_at=data.ended_at,
        comment=data.comment,
        changed_by=changed_by or data.changed_by,
    )
    if entry.ended_at is None:
        status = _ensure_operational_status(db, machine_id)
        status.state = data.state
        status.last_update = started
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def close_current_state(
    db: Session,
    machine_id: int,
    ended_at: Optional[datetime] = None,
) -> Optional[MachineStateHistory]:
    """Clôture l'état historique en cours et met la machine en PAUSE."""
    current = (
        db.query(MachineStateHistory)
        .filter(
            MachineStateHistory.machine_id == machine_id,
            MachineStateHistory.ended_at.is_(None),
        )
        .order_by(desc(MachineStateHistory.started_at))
        .first()
    )
    now = ended_at or utc_now_naive()
    if current:
        current.ended_at = now
    status = _ensure_operational_status(db, machine_id)
    status.state = MachineOperationalState.PAUSE
    status.last_update = now
    db.commit()
    if current:
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
    if entry.ended_at is None:
        status = _ensure_operational_status(db, entry.machine_id)
        status.state = entry.state
        status.last_update = entry.started_at
    db.commit()
    db.refresh(entry)
    return entry


def change_state(
    db: Session,
    machine_id: int,
    new_state: str,
    comment: Optional[str] = None,
    changed_by: Optional[str] = None,
) -> MachineStateHistory:
    """
    Change l'état d'une machine :
    1. Clôture l'état actuel (ended_at = now)
    2. Crée une nouvelle entrée avec le nouvel état
    """
    now = utc_now_naive()
    current = (
        db.query(MachineStateHistory)
        .filter(
            MachineStateHistory.machine_id == machine_id,
            MachineStateHistory.ended_at.is_(None),
        )
        .order_by(desc(MachineStateHistory.started_at))
        .first()
    )
    if current:
        current.ended_at = now
    return add_state_history(
        db,
        machine_id,
        StateHistoryCreate(state=new_state, started_at=now, ended_at=None, comment=comment),
        changed_by=changed_by,
    )
