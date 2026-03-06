"""Routes API pour la gestion des machines."""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from .model import Machine
from .schema import (
    MachineCreate,
    MachineUpdate,
    MachineResponse,
    MachineInDB,
    StateHistoryCreate,
    StateHistoryUpdate,
    StateHistoryResponse,
    MachineCurrentState,
    ChangeStateRequest,
)
from .service import (
    get_machines,
    get_machine_by_id,
    get_machine_by_reference,
    create_machine,
    update_machine,
    delete_machine,
    get_current_state,
    get_state_history,
    add_state_history,
    close_current_state,
    update_state_history,
    change_state,
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
    if get_machine_by_reference(db, data.reference):
        raise HTTPException(status_code=400, detail="Une machine avec cette référence existe déjà")
    return create_machine(db, data)


@router.patch("/{machine_id}", response_model=MachineInDB)
def update_machine_endpoint(machine_id: int, data: MachineUpdate, db: Session = Depends(get_db)):
    """Met à jour une machine."""
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    if data.reference and data.reference != machine.reference:
        if get_machine_by_reference(db, data.reference):
            raise HTTPException(status_code=400, detail="Cette référence est déjà utilisée")
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
    state: Optional[str] = Query(None, pattern="^(running|stopped|failure)$"),
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
def change_machine_state(
    machine_id: int,
    data: ChangeStateRequest,
    db: Session = Depends(get_db),
):
    """
    Change l'état de la machine : clôture l'état actuel et enregistre le nouveau.
    État : running | stopped | failure
    """
    machine = get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(status_code=404, detail="Machine non trouvée")
    return change_state(db, machine_id, data.state, comment=data.comment)


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
