"""Reports API — manager-only endpoints for daily and weekly production reports."""

from datetime import date as dt_date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db

from .service import (
    get_daily_report,
    get_maintenance_report,
    get_performance_report,
    get_production_of_report,
    get_traceability_report,
    get_weekly_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_manager(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Réservé aux managers")
    return current_user


@router.get("/daily")
def daily_report(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    """Daily production report: production totals, OEE, per-machine availability, rejects."""
    return get_daily_report(db, dt_date.fromisoformat(date))


@router.get("/weekly")
def weekly_report(
    week: str = Query(..., pattern=r"^\d{4}-\d{1,2}$", description="YYYY-WW (e.g. 2026-17)"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    """Weekly production report: 7-day breakdown, machines most down, production by machine."""
    year, w = map(int, week.split("-"))
    if not (1 <= w <= 53):
        raise HTTPException(status_code=422, detail="Numéro de semaine invalide (1-53)")
    return get_weekly_report(db, year, w)


def _parse_range(date_from: str, date_to: str) -> tuple[dt_date, dt_date]:
    d_from = dt_date.fromisoformat(date_from)
    d_to   = dt_date.fromisoformat(date_to)
    if d_to < d_from:
        raise HTTPException(status_code=422, detail="date_to doit être >= date_from")
    return d_from, d_to


@router.get("/production")
def production_of_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    """Production report grouped by OF, with step durations and reject breakdown."""
    d_from, d_to = _parse_range(date_from, date_to)
    return get_production_of_report(db, d_from, d_to)


@router.get("/maintenance")
def maintenance_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    """Maintenance report: intervention history and machines most impacted."""
    d_from, d_to = _parse_range(date_from, date_to)
    return get_maintenance_report(db, d_from, d_to)


@router.get("/performance")
def performance_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    """OEE performance report: global KPIs, per-machine OEE, daily trend (≤31 days)."""
    d_from, d_to = _parse_range(date_from, date_to)
    return get_performance_report(db, d_from, d_to)


@router.get("/traceability")
def traceability_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    """Traceability report: lots with embedded steps, date-filtered via string prefix."""
    d_from, d_to = _parse_range(date_from, date_to)
    return get_traceability_report(db, d_from, d_to)
