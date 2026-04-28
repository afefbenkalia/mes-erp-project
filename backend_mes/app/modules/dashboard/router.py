"""
app/modules/dashboard/router.py
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from .service import get_machine_kpis, get_production_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """KPIs globaux + série horaire (24h)."""
    return get_production_summary(db)


@router.get("/machine-kpis")
def machine_kpis(db: Session = Depends(get_db)):
    """
    KPIs par machine pour aujourd'hui.

    Réponse :
        {
          "CT-CARD-01": {"production_per_day": 120.5, "rejects_per_day": 3.0},
          "CT-NET-01":  {"production_per_day": 95.0,  "rejects_per_day": 0.0},
          ...
        }

    Clé = machine code (= etapes_production.machine = rebuts.machine).
    """
    return get_machine_kpis(db)