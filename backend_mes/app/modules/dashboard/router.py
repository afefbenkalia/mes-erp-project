"""
app/modules/dashboard/router.py
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from .service import (
    get_machine_kpis,
    get_production_summary,
    get_scrap_rate_by_of_numero,
    get_production_last_24h,
    get_productions_list,
    _compute_of_nominal_rates,
)
from app.modules.production.model import EtapeProduction, StatutEtape
from datetime import date
from app.modules.production.model import Production
from fastapi import Query

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/productions")
def productions_list(db: Session = Depends(get_db)):
    """
    Retourne la liste de toutes les productions avec of_numero et production_id.
    
    Retourne: [{"production_id": 123, "of_numero": "OF-2024-001"}, ...]
    """
    return get_productions_list(db)


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """KPIs globaux + série horaire (24h). FIXED LOGIC."""
    return get_production_summary(db)


@router.get("/machine-kpis")
def machine_kpis(db: Session = Depends(get_db)):
    """
    KPIs par machine pour aujourd'hui.
    Uses only qty_out from completed steps.
    """
    return get_machine_kpis(db)


@router.get("/production-last-24h")
def production_last_24h(production_id: int | None = None, db: Session = Depends(get_db)):
    """
    Production de chaque machine pour une production spécifique.
    
    Query Params:
      - production_id (optional): ID de la production à afficher.
                                  Si absent, utilise la production active.
    
    Retourne: [{"machine": "CT-ALIM-01", "nom_machine": "Alimentation", "qte_sortie": 246.79}, ...]
    """
    return get_production_last_24h(db, production_id=production_id)


@router.get("/scrap-rate")
def scrap_rate(of_numero: str | None = None, db: Session = Depends(get_db)):
        """
        Taux de rebut par machine pour un OF donné.

        Query Params:
            - of_numero: OF à afficher

        Retourne: [{"machine": "CT-ALIM-01", "nom_machine": "Alimentation", "production_total": 246.79, "rebut_total": 4.2, "rebut_rate": 1.7}, ...]
        """
        return get_scrap_rate_by_of_numero(db, of_numero=of_numero)


@router.get("/debug-nominal-rates")
def debug_nominal_rates(db: Session = Depends(get_db)):
    """Debug endpoint: retourne les taux nominaux calculés pour les OFs actifs aujourd'hui."""
    today = date.today()
    rows = (
        db.query(EtapeProduction.production_id)
        .filter(EtapeProduction.date >= today, EtapeProduction.statut == StatutEtape.TERMINE)
        .distinct()
        .all()
    )
    prod_ids = [r.production_id for r in rows]
    rates = _compute_of_nominal_rates(db, prod_ids, today)
    return {"production_ids": prod_ids, "nominal_rates": rates}


@router.get("/debug-steps")
def debug_steps(production_ids: str | None = Query(None, description="Comma-separated production ids"), db: Session = Depends(get_db)):
    """Debug endpoint: retourne les étapes (debut/fin/etat/qte) pour les productions demandées."""
    today = date.today()
    ids: list[int] = []
    if production_ids:
        try:
            ids = [int(x) for x in production_ids.split(",") if x.strip()]
        except ValueError:
            return {"error": "invalid production_ids"}

    q = db.query(EtapeProduction.production_id, EtapeProduction.machine, EtapeProduction.debut, EtapeProduction.fin, EtapeProduction.statut, EtapeProduction.qte_sortie, EtapeProduction.qte_entree, EtapeProduction.date)
    q = q.filter(EtapeProduction.date >= today)
    if ids:
        q = q.filter(EtapeProduction.production_id.in_(ids))
    rows = q.all()
    result = [
        {
            "production_id": r.production_id,
            "machine": r.machine,
            "debut": r.debut,
            "fin": r.fin,
            "statut": str(r.statut),
            "qte_sortie": float(r.qte_sortie or 0.0),
            "qte_entree": float(r.qte_entree or 0.0),
            "date": str(r.date),
        }
        for r in rows
    ]
    return result


@router.get("/debug-productions")
def debug_productions(db: Session = Depends(get_db)):
    """Retourne productions récentes et leurs quantités (pour debugging nominal rate calc)."""
    prods = db.query(Production.id, Production.of_numero, Production.quantite_produit_fini, Production.quantite_matiere_premiere, Production.statut).order_by(Production.id.desc()).limit(20).all()
    return [
        {
            "id": p.id,
            "of_numero": p.of_numero,
            "quantite_produit_fini": float(p.quantite_produit_fini or 0.0),
            "quantite_matiere_premiere": float(p.quantite_matiere_premiere or 0.0),
            "statut": str(p.statut),
        }
        for p in prods
    ]