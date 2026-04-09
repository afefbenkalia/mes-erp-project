from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db

from .service import get_production_summary

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    """KPIs et séries pour le tableau de bord production (24h)."""
    return get_production_summary(db)
