"""
router.py – Traçabilité MES
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from . import service, schema

router = APIRouter(prefix="/traceability", tags=["Traçabilité MES"])


# ─── Résumé global ────────────────────────────────────────────────────────────

@router.get("/summary", response_model=schema.TraceabilitySummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    """KPIs globaux de traçabilité."""
    return service.get_summary(db)


# ─── Suivi par lot ────────────────────────────────────────────────────────────

@router.get("/lots", response_model=list[schema.LotTraceResponse])
def get_lots(
    statut : Optional[str] = Query(None, description="Filtrer par statut : EN_ATTENTE, EN_COURS, TERMINE"),
    produit: Optional[str] = Query(None, description="Filtrer par produit fini"),
    db     : Session = Depends(get_db),
):
    """Liste toutes les productions avec leurs KPIs de traçabilité."""
    return service.get_all_lots(db, statut=statut, produit=produit)


@router.get("/lots/{production_id}", response_model=schema.LotTraceResponse)
def get_lot(production_id: int, db: Session = Depends(get_db)):
    """Fiche de traçabilité complète d'une production (lot)."""
    result = service.get_lot_trace(db, production_id)
    if not result:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Production introuvable")
    return result


# ─── Historisation ────────────────────────────────────────────────────────────

@router.get("/historique", response_model=list[schema.HistoriqueItemResponse])
def get_historique(
    production_id: Optional[int] = Query(None),
    machine      : Optional[str] = Query(None),
    evenement    : Optional[str] = Query(None),
    limit        : int = Query(200, ge=1, le=1000),
    db           : Session = Depends(get_db),
):
    """Historique des événements de production."""
    return service.get_historique(db, production_id=production_id,
                                   machine=machine, evenement=evenement, limit=limit)


# ─── Association Machines ─────────────────────────────────────────────────────

@router.get("/machines", response_model=list[schema.AssociationMachineResponse])
def get_association_machines(db: Session = Depends(get_db)):
    """
    Association machine ↔ productions :
    statistiques par machine (qtés, rendement, rebuts, dernière utilisation).
    """
    return service.get_association_machines(db)