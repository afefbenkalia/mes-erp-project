"""Routes API pour la gestion des machines."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.datetime_utc import utc_now_naive
from app.core.security import get_current_user
from app.database import get_db
from app.modules.auth import service as auth_service
from app.modules.auth.model import User
from app.modules.dashboard.service import compute_machine_state_seconds
from app.modules.maintenance.realtime import maintenance_ws_manager
from app.utils.email_service import send_maintenance_notification_email

from .model import Machine
from .schema import (
    ChangeStateRequest,
    MachineCreate,
    MachineCurrentState,
    MachineInDB,
    MachineResponse,
    MachineUpdate,
    StateHistoryCreate,
    StateHistoryResponse,
    StateHistoryUpdate,
)
from .service import (
    add_state_history,
    change_state,
    close_current_state,
    create_machine,
    delete_machine,
    get_current_state,
    get_machine_by_id,
    get_machines,
    get_state_history,
    update_machine,
    update_state_history,
)

logger = logging.getLogger(__name__)

# Transitions autorisées depuis l'endpoint opérateur (jamais vers MAINTENANCE)
_OPERATOR_BLOCKED_CURRENT = {"ERREUR", "MAINTENANCE"}
_OPERATOR_BLOCKED_TARGET = {"MAINTENANCE"}

# Transitions valides : (état_courant, nouvel_état)
_VALID_TRANSITIONS = {
    ("MARCHE", "PAUSE"),
    ("MARCHE", "ERREUR"),
    ("PAUSE", "MARCHE"),
    ("PAUSE", "ERREUR"),
}


async def _notify_maintenance_error(db: Session, machine, declared_by: str, comment: str | None) -> None:
    """Diffuse une notification ERREUR aux clients WS et envoie un e-mail à la maintenance."""
    payload = {
        "message": f"Machine {machine.reference} en ERREUR",
        "machine_id": machine.id,
        "machine_reference": machine.reference,
        "machine_name": machine.name,
        "state": "ERREUR",
        "declared_by": declared_by,
        "comment": comment or "",
        "target_role": "maintenance",
    }
    # Persistance : la notification reste visible pour la maintenance même si
    # aucun technicien n'était connecté au moment de la déclaration (suivi de l'incident).
    # notif_id partagé entre la copie WS et la copie DB → déduplication côté front.
    try:
        created = auth_service.create_notification(
            db,
            type="machine_error",
            title=payload["message"],
            target_role="maintenance",
            payload=payload,
        )
        payload["notif_id"] = created.id
    except Exception:
        logger.exception("Échec de la persistance de la notification ERREUR pour machine %s", machine.id)
    await maintenance_ws_manager.broadcast("notification", payload)
    await maintenance_ws_manager.broadcast(
        "machine_update",
        {
            "machine_id": machine.id,
            "machine_reference": machine.reference,
            "machine_name": machine.name,
            "state": "ERREUR",
        },
    )
    recipients = (
        db.query(User.email)
        .filter(User.role.in_(["maintenance", "responsable_maintenance"]), User.is_active.is_(True))
        .all()
    )
    emails = [e for (e,) in recipients if e]
    if emails:
        await asyncio.gather(
            *[asyncio.to_thread(send_maintenance_notification_email, email, payload) for email in emails]
        )


router = APIRouter(prefix="/machines", tags=["machines"])


# ============ Machines ============

@router.get("", response_model=List[MachineResponse])
def list_machines(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    reference: Optional[str] = None,
    machine_type: Optional[str] = None,
    include_current_state: bool = Query(True),
    db: Session = Depends(get_db),
):
    """
    Liste toutes les machines avec filtres optionnels.
    Chaque machine inclut son état actuel si include_current_state=True.
    """
    machines = get_machines(db, skip=skip, limit=limit, reference=reference, machine_type=machine_type)
    result = []
    for m in machines:
        d = MachineInDB.model_validate(m).model_dump()
        if include_current_state:
            current = get_current_state(db, m.id)
            d["current_state"] = current.state if current else None
            d["current_state_started_at"] = current.started_at if current else None
        else:
            d["current_state"] = None
            d["current_state_started_at"] = None
        result.append(MachineResponse(**d))
    return result


@router.get("/runtime-stats")
def get_runtime_stats(db: Session = Depends(get_db)):
    """
    Runtime / downtime par machine pour MachineTable — fenêtre alignée
    sur minuit heure système locale. Reset automatique à 00:00 chaque jour.

    Logique :
      - since = minuit local (heure système réelle, convertie en UTC naïf
        car la DB stocke des timestamps UTC naïfs via utc_now_naive())
      - Pour chaque entrée d'historique chevauchant [since, now] :
        - durée d'overlap clippée à la fenêtre
        - MARCHE → runtime, PAUSE/ERREUR/MAINTENANCE → downtime
      - Filtre commun appliqué via compute_machine_state_seconds :
        l'entrée système initiale (changed_by='system', ended_at=NULL)
        est exclue.

    Le dashboard (/api/dashboard/summary) garde sa fenêtre 24h glissante
    pour éviter le drop visuel à minuit. Les deux endpoints partagent le
    même helper compute_machine_state_seconds, garantissant cohérence.
    """
    # Pivot 00:00 heure système locale, exprimé en UTC naïf
    local_now      = datetime.now().astimezone()
    midnight_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    since          = midnight_local.astimezone(timezone.utc).replace(tzinfo=None)
    now            = utc_now_naive()

    machines = db.query(Machine).all()
    stats: dict[int, dict] = {
        m.id: {"runtime_minutes": 0.0, "downtime_minutes": 0.0}
        for m in machines
    }
    state_seconds = compute_machine_state_seconds(db, since, now)
    for mid, sec in state_seconds.items():
        stats.setdefault(mid, {"runtime_minutes": 0.0, "downtime_minutes": 0.0})
        stats[mid]["runtime_minutes"]  = round(sec["runtime_seconds"]  / 60.0, 1)
        stats[mid]["downtime_minutes"] = round(sec["downtime_seconds"] / 60.0, 1)
    return stats


@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: int, db: Session = Depends(get_db)):
    """Récupère une machine par ID avec son état actuel."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    current = get_current_state(db, machine_id)
    return MachineResponse(
        **MachineInDB.model_validate(machine).model_dump(),
        current_state=current.state if current else None,
        current_state_started_at=current.started_at if current else None,
    )


@router.post("", response_model=MachineInDB, status_code=201)
def create_machine_endpoint(data: MachineCreate, db: Session = Depends(get_db)):
    """Crée une nouvelle machine."""
    return create_machine(db, data)


@router.patch("/{machine_id}", response_model=MachineInDB)
def update_machine_endpoint(machine_id: int, data: MachineUpdate, db: Session = Depends(get_db)):
    """Met à jour une machine."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    return update_machine(db, machine, data)


@router.delete("/{machine_id}", status_code=204)
def delete_machine_endpoint(machine_id: int, db: Session = Depends(get_db)):
    """Supprime une machine."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    delete_machine(db, machine)


# ============ État actuel ============

@router.get("/{machine_id}/current-state", response_model=MachineCurrentState)
def get_machine_current_state(machine_id: int, db: Session = Depends(get_db)):
    """Retourne l'état actuel de la machine (marche, arrêt ou panne)."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    current = get_current_state(db, machine_id)
    if not current:
        raise HTTPException(status_code=404, detail="Aucun état enregistré pour cette machine")
    return MachineCurrentState(
        machine_id=machine_id,
        current_state=current.state,
        started_at=current.started_at,
        is_active=current.ended_at is None,
    )


# ============ Historique des états ============

@router.get("/{machine_id}/state-history", response_model=List[StateHistoryResponse])
def list_state_history(
    machine_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    state: Optional[str] = Query(None, pattern="^(MARCHE|PAUSE|ERREUR|MAINTENANCE)$"),
    db: Session = Depends(get_db),
):
    """Liste l'historique des états d'une machine."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    return get_state_history(db, machine_id, skip=skip, limit=limit, state=state)


@router.post("/{machine_id}/state-history", response_model=StateHistoryResponse, status_code=201)
def add_machine_state_history(
    machine_id: int,
    data: StateHistoryCreate,
    db: Session = Depends(get_db),
):
    """
    Ajoute une entrée à l'historique des états.
    Pour changer d'état en fermant l'actuel, préférer POST /{machine_id}/change-state.
    """
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    return add_state_history(db, machine_id, data)


@router.post("/{machine_id}/change-state", response_model=StateHistoryResponse, status_code=201)
async def change_machine_state(
    machine_id: int,
    data: ChangeStateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Change l'état de la machine (endpoint opérateur).
    Transitions autorisées : MARCHE↔PAUSE, MARCHE/PAUSE→ERREUR.
    MAINTENANCE est interdit ici — passer par l'endpoint maintenance/take-over.
    """
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")

    # --- Règle 1 : MAINTENANCE interdit depuis cet endpoint ---
    if data.state in _OPERATOR_BLOCKED_TARGET:
        raise HTTPException(
            status_code=403,
            detail="Transition vers MAINTENANCE interdite : utilisez le workflow maintenance (prise en charge).",
        )

    # --- Règle 2 : état courant bloquant ---
    current = get_current_state(db, machine_id)
    current_state = current.state if current else "MARCHE"

    if current_state in _OPERATOR_BLOCKED_CURRENT:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Machine en {current_state} : "
                + ("la maintenance doit prendre en charge l'erreur." if current_state == "ERREUR"
                   else "la maintenance doit marquer la machine comme réparée.")
            ),
        )

    # --- Règle 3 : transition valide ---
    if (current_state, data.state) not in _VALID_TRANSITIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Transition {current_state} → {data.state} non autorisée.",
        )

    changed_by: str = current_user.get("sub", "inconnu")
    comment = data.comment
    if data.state == "ERREUR" and data.error_type:
        comment = f"[{data.error_type}] {comment or ''}".strip()

    result = change_state(db, machine_id, data.state, comment=comment, changed_by=changed_by)

    # --- Notification maintenance si ERREUR ---
    if data.state == "ERREUR":
        try:
            await _notify_maintenance_error(db, machine, declared_by=changed_by, comment=comment)
        except Exception:
            logger.exception("Erreur lors de la notification maintenance pour machine %s", machine_id)

    return result


@router.patch("/{machine_id}/state-history/{history_id}", response_model=StateHistoryResponse)
def update_machine_state_history(
    machine_id: int,
    history_id: int,
    data: StateHistoryUpdate,
    db: Session = Depends(get_db),
):
    """Met à jour une entrée d'historique (ex: ajouter ended_at)."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    entry = update_state_history(db, history_id, data)
    if not entry or entry.machine_id != machine_id:
        raise HTTPException(status_code=404, detail="Entrée d'historique non trouvée")
    return entry


@router.post("/{machine_id}/close-current-state", response_model=StateHistoryResponse)
def close_machine_current_state(machine_id: int, db: Session = Depends(get_db)):
    """Clôture l'état actuel de la machine (met ended_at = maintenant)."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    updated = close_current_state(db, machine_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Aucun état en cours à clôturer")
    return updated


