"""Business logic for maintenance dashboard."""

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.core.datetime_utc import utc_now_naive
from app.modules.machines.model import Machine
from app.modules.machines.model import MachineStateHistory

from .model import (
    MachineOperationalState,
    MachineOperationalStatus,
    MaintenanceHistory,
    MaintenanceIntervention,
    MaintenanceInterventionStatus,
    PreventiveMaintenance,
)


def _get_machine_or_none(db: Session, machine_id: int) -> Optional[Machine]:
    return db.query(Machine).filter(Machine.id == machine_id).first()


def _get_open_intervention(
    db: Session, machine_id: int
) -> Optional[MaintenanceIntervention]:
    return (
        db.query(MaintenanceIntervention)
        .filter(
            MaintenanceIntervention.machine_id == machine_id,
            MaintenanceIntervention.status == MaintenanceInterventionStatus.EN_MAINTENANCE,
        )
        .order_by(MaintenanceIntervention.start_time.desc())
        .first()
    )


def ensure_machine_status(db: Session, machine_id: int) -> MachineOperationalStatus:
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


def initialize_missing_machine_states(db: Session) -> None:
    machine_ids = [machine.id for machine in db.query(Machine.id).all()]
    for machine_id in machine_ids:
        ensure_machine_status(db, machine_id)


def list_machine_statuses(db: Session) -> list[tuple[Machine, MachineOperationalStatus]]:
    initialize_missing_machine_states(db)
    rows = (
        db.query(Machine, MachineOperationalStatus)
        .join(MachineOperationalStatus, MachineOperationalStatus.machine_id == Machine.id)
        .order_by(Machine.id.asc())
        .all()
    )
    return rows


def list_open_interventions(db: Session) -> list[MaintenanceIntervention]:
    return (
        db.query(MaintenanceIntervention)
        .filter(MaintenanceIntervention.status == MaintenanceInterventionStatus.EN_MAINTENANCE)
        .order_by(MaintenanceIntervention.start_time.desc())
        .all()
    )


def list_history(db: Session, limit: int = 200) -> list[MaintenanceHistory]:
    return (
        db.query(MaintenanceHistory)
        .order_by(MaintenanceHistory.date.desc())
        .limit(limit)
        .all()
    )


def set_machine_error(
    db: Session, machine_id: int
) -> tuple[Machine, MachineOperationalStatus, bool]:
    machine = _get_machine_or_none(db, machine_id)
    if not machine:
        raise ValueError("Machine non trouvée")

    status = ensure_machine_status(db, machine_id)
    open_intervention = _get_open_intervention(db, machine_id)
    if open_intervention:
        # An intervention is already in progress: ignore duplicate error events
        # and keep state bound to MAINTENANCE.
        if status.state != MachineOperationalState.MAINTENANCE:
            status.state = MachineOperationalState.MAINTENANCE
            status.last_update = utc_now_naive()
            db.commit()
            db.refresh(status)
        return machine, status, False

    previous_state = status.state

    if previous_state == MachineOperationalState.ERREUR:
        # Keep idempotent behavior: no timestamp update and no duplicate event.
        return machine, status, False

    status.state = MachineOperationalState.ERREUR
    status.last_update = utc_now_naive()
    db.commit()
    db.refresh(status)
    return machine, status, True


def set_machine_error_by_reference(
    db: Session, machine_reference: str
) -> tuple[Machine, MachineOperationalStatus, bool]:
    machine = db.query(Machine).filter(Machine.reference == machine_reference).first()
    if not machine:
        raise ValueError("Machine non trouvée")
    return set_machine_error(db, machine.id)


def take_over_machine(
    db: Session, machine_id: int, technician: str
) -> tuple[Machine, MachineOperationalStatus, MaintenanceIntervention]:
    machine = _get_machine_or_none(db, machine_id)
    if not machine:
        raise ValueError("Machine non trouvée")

    status = ensure_machine_status(db, machine_id)

    open_intervention = _get_open_intervention(db, machine_id)
    if open_intervention:
        # Block duplicate "take over" actions while intervention is active.
        raise ValueError("Une intervention est déjà en cours pour cette machine")

    if status.state != MachineOperationalState.ERREUR:
        raise ValueError("La machine doit être en ERREUR pour être prise en charge")

    intervention = MaintenanceIntervention(
        machine_id=machine_id,
        technician=technician,
        status=MaintenanceInterventionStatus.EN_MAINTENANCE,
        start_time=utc_now_naive(),
    )
    status.state = MachineOperationalState.MAINTENANCE
    status.last_update = utc_now_naive()

    db.add(intervention)
    db.commit()
    db.refresh(status)
    db.refresh(intervention)
    return machine, status, intervention


def mark_machine_repaired(
    db: Session, machine_id: int, technician: str, action_effectuee: str
) -> tuple[Machine, MachineOperationalStatus, MaintenanceIntervention, MaintenanceHistory]:
    machine = _get_machine_or_none(db, machine_id)
    if not machine:
        raise ValueError("Machine non trouvée")

    status = ensure_machine_status(db, machine_id)
    if status.state != MachineOperationalState.MAINTENANCE:
        raise ValueError("La machine doit être en MAINTENANCE")

    intervention = (
        db.query(MaintenanceIntervention)
        .filter(
            MaintenanceIntervention.machine_id == machine_id,
            MaintenanceIntervention.status == MaintenanceInterventionStatus.EN_MAINTENANCE,
        )
        .order_by(MaintenanceIntervention.start_time.desc())
        .first()
    )
    if not intervention:
        raise ValueError("Aucune intervention EN_MAINTENANCE trouvée")

    now = utc_now_naive()
    intervention.status = MaintenanceInterventionStatus.REPAIREE
    intervention.end_time = now
    intervention.action_effectuee = action_effectuee
    intervention.technician = technician

    duration = max(int((now - intervention.start_time).total_seconds()), 0)
    history = MaintenanceHistory(
        machine_id=machine_id,
        technician=technician,
        duration_seconds=duration,
        date=now,
        action_effectuee=action_effectuee,
    )
    status.state = MachineOperationalState.MARCHE
    status.last_update = now
    preventive_in_progress = (
        db.query(PreventiveMaintenance)
        .filter(
            PreventiveMaintenance.machine_id == machine_id,
            PreventiveMaintenance.status == "EN COURS",
        )
        .all()
    )
    for item in preventive_in_progress:
        item.status = "TERMINE"

    db.add(history)
    db.commit()
    db.refresh(status)
    db.refresh(intervention)
    db.refresh(history)
    return machine, status, intervention, history


def create_preventive_maintenance(
    db: Session,
    machine_id: int,
    planned_date: Optional[datetime],
    maintenance_type: str,
    status: str,
    trigger_mode: str,
    runtime_threshold_minutes: Optional[int],
) -> PreventiveMaintenance:
    machine = _get_machine_or_none(db, machine_id)
    if not machine:
        raise ValueError("Machine non trouvée")

    item = PreventiveMaintenance(
        machine_id=machine_id,
        planned_date=planned_date,
        maintenance_type=maintenance_type,
        trigger_mode=trigger_mode,
        runtime_threshold_minutes=runtime_threshold_minutes,
        status=status,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_preventive_maintenance(db: Session, limit: int = 200) -> list[PreventiveMaintenance]:
    return (
        db.query(PreventiveMaintenance)
        .order_by(
            PreventiveMaintenance.status.asc(),
            PreventiveMaintenance.planned_date.asc().nulls_last(),
        )
        .limit(limit)
        .all()
    )


def update_preventive_maintenance(
    db: Session,
    preventive_id: int,
    planned_date: Optional[datetime],
    maintenance_type: Optional[str],
    trigger_mode: Optional[str],
    runtime_threshold_minutes: Optional[int],
    status: Optional[str],
) -> PreventiveMaintenance:
    item = db.query(PreventiveMaintenance).filter(PreventiveMaintenance.id == preventive_id).first()
    if not item:
        raise ValueError("Maintenance préventive non trouvée")

    new_trigger_mode = trigger_mode or item.trigger_mode

    if planned_date is not None:
        item.planned_date = planned_date
    if maintenance_type is not None:
        item.maintenance_type = maintenance_type
    if trigger_mode is not None:
        item.trigger_mode = trigger_mode
    if status is not None:
        item.status = status

    if new_trigger_mode == "SCHEDULED":
        item.runtime_threshold_minutes = None
        if runtime_threshold_minutes is not None:
            raise ValueError("runtime_threshold_minutes interdit pour trigger_mode=SCHEDULED")
        if item.planned_date is None:
            raise ValueError("planned_date requis pour trigger_mode=SCHEDULED")
    elif new_trigger_mode == "RUNTIME":
        item.planned_date = None
        if runtime_threshold_minutes is not None:
            item.runtime_threshold_minutes = runtime_threshold_minutes
        if item.runtime_threshold_minutes is None:
            raise ValueError("runtime_threshold_minutes requis pour trigger_mode=RUNTIME")

    db.commit()
    db.refresh(item)
    return item


def delete_preventive_maintenance(db: Session, preventive_id: int) -> None:
    item = db.query(PreventiveMaintenance).filter(PreventiveMaintenance.id == preventive_id).first()
    if not item:
        raise ValueError("Maintenance préventive non trouvée")
    db.delete(item)
    db.commit()


def _runtime_minutes_since_start(db: Session, machine_id: int) -> int:
    now = utc_now_naive()
    entries = (
        db.query(MachineStateHistory)
        .filter(
            MachineStateHistory.machine_id == machine_id,
            MachineStateHistory.state == MachineOperationalState.MARCHE,
        )
        .all()
    )
    total_seconds = 0.0
    for entry in entries:
        end_at = entry.ended_at or now
        if end_at <= entry.started_at:
            continue
        total_seconds += (end_at - entry.started_at).total_seconds()
    return int(total_seconds // 60)


def _is_preventive_due(db: Session, item: PreventiveMaintenance, now: datetime) -> bool:
    if item.status != "PLANIFIE":
        return False
    if item.trigger_mode == "SCHEDULED":
        return item.planned_date is not None and item.planned_date <= now
    if item.trigger_mode == "RUNTIME":
        if item.runtime_threshold_minutes is None:
            return False
        return _runtime_minutes_since_start(db, item.machine_id) >= item.runtime_threshold_minutes
    return False


def check_and_trigger_due_preventive_maintenance(db: Session) -> list[dict]:
    """
    Trigger due preventive tasks by switching machine to MAINTENANCE and opening a single
    active intervention if none exists.
    """
    now = utc_now_naive()
    due_items = db.query(PreventiveMaintenance).filter(PreventiveMaintenance.status == "PLANIFIE").all()
    events: list[dict] = []

    for item in due_items:
        if not _is_preventive_due(db, item, now):
            continue

        machine = _get_machine_or_none(db, item.machine_id)
        if not machine:
            continue

        status = ensure_machine_status(db, item.machine_id)
        open_intervention = _get_open_intervention(db, item.machine_id)

        item.status = "EN COURS"
        item.last_triggered_at = now

        intervention_created = False
        intervention = open_intervention
        if intervention is None:
            intervention = MaintenanceIntervention(
                machine_id=item.machine_id,
                technician="Responsable de Maintenance",
                status=MaintenanceInterventionStatus.EN_MAINTENANCE,
                start_time=now,
                action_effectuee=f"Préventive: {item.maintenance_type}",
            )
            db.add(intervention)
            intervention_created = True

        status.state = MachineOperationalState.MAINTENANCE
        status.last_update = now
        db.commit()
        db.refresh(status)
        if intervention is not None:
            db.refresh(intervention)
        db.refresh(item)

        events.append(
            {
                "message": f"Maintenance préventive due pour machine {machine.reference}",
                "machine_id": machine.id,
                "machine_reference": machine.reference,
                "machine_name": machine.name,
                "state": status.state,
                "preventive_id": item.id,
                "trigger_mode": item.trigger_mode,
                "intervention_created": intervention_created,
            }
        )

    return events
