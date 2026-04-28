"""
router.py – Traçabilité MES

Endpoints :
  GET  /traceabilite/                          → liste des lots (résumé)
  GET  /traceabilite/{lot_id}                  → lot complet
  GET  /traceabilite/numero/{numero_lot}       → lot par numéro
  GET  /traceabilite/production/{prod_id}      → lot par production_id
  GET  /traceabilite/{lot_id}/evenements       → journal d'audit
  GET  /traceabilite/{lot_id}/alertes          → alertes qualité
  PATCH /traceabilite/alertes/{alerte_id}/acquitter
  GET  /traceabilite/{lot_id}/rapport          → rapport synthétique
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from . import service, schema

router = APIRouter(prefix="/traceabilite", tags=["Traçabilité MES"])


# ─────────────────────────────────────────────
#  LOTS
# ─────────────────────────────────────────────

@router.get("/", response_model=list[schema.LotSummaryResponse])
def get_lots(
    statut : Optional[str] = Query(None, description="Filtrer par statut"),
    produit: Optional[str] = Query(None, description="Filtrer par produit (partiel)"),
    db     : Session = Depends(get_db),
):
    """Liste paginée des lots de traçabilité (version allégée)."""
    return service.get_lots(db, statut=statut, produit=produit)


@router.get("/numero/{numero_lot}", response_model=schema.LotTraceabiliteResponse)
def get_lot_by_numero(numero_lot: str, db: Session = Depends(get_db)):
    """Récupère un lot complet par son numéro (ex: LOT-OF-001-1-250620-A3F2)."""
    return service.get_lot_by_numero(db, numero_lot)


@router.get("/production/{production_id}", response_model=schema.LotTraceabiliteResponse)
def get_lot_by_production(production_id: int, db: Session = Depends(get_db)):
    """Récupère le lot de traçabilité associé à une production."""
    return service.get_lot_by_production_id(db, production_id)


@router.get("/{lot_id}", response_model=schema.LotTraceabiliteResponse)
def get_lot(lot_id: int, db: Session = Depends(get_db)):
    """Récupère un lot complet avec toutes ses étapes, événements et alertes."""
    return service.get_lot(db, lot_id)


# ─────────────────────────────────────────────
#  JOURNAL D'AUDIT
# ─────────────────────────────────────────────

@router.get("/{lot_id}/evenements", response_model=list[schema.EvenementResponse])
def get_evenements(lot_id: int, db: Session = Depends(get_db)):
    """Journal horodaté complet de toutes les actions sur le lot."""
    return service.get_evenements_lot(db, lot_id)


# ─────────────────────────────────────────────
#  ALERTES QUALITÉ
# ─────────────────────────────────────────────

@router.get("/{lot_id}/alertes", response_model=list[schema.AlerteQualiteResponse])
def get_alertes(lot_id: int, db: Session = Depends(get_db)):
    """Toutes les alertes qualité du lot."""
    return service.get_alertes_lot(db, lot_id)


@router.patch(
    "/alertes/{alerte_id}/acquitter",
    response_model=schema.AlerteQualiteResponse,
)
def acquitter_alerte(
    alerte_id: int,
    body: schema.AlerteAcquittement,
    db: Session = Depends(get_db),
):
    """Acquitte (reconnaît) une alerte qualité."""
    return service.acquitter_alerte(db, alerte_id)


# ─────────────────────────────────────────────
#  RAPPORT
# ─────────────────────────────────────────────

@router.get("/{lot_id}/rapport", response_model=schema.RapportTraceabilite)
def get_rapport(lot_id: int, db: Session = Depends(get_db)):
    """
    Génère le rapport synthétique complet du lot :
    rendement par étape, rebuts agrégés, durée, conformité, résumé.
    """
    return service.generer_rapport(db, lot_id)