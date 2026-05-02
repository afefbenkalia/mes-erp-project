"""Reports API — manager-only endpoints + envoi automatique vers l'ERP."""

from datetime import date as dt_date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db

from .erp_sender import send_report_to_erp          # ← NOUVEAU
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


def _parse_range(date_from: str, date_to: str) -> tuple[dt_date, dt_date]:
    d_from = dt_date.fromisoformat(date_from)
    d_to   = dt_date.fromisoformat(date_to)
    if d_to < d_from:
        raise HTTPException(status_code=422, detail="date_to doit être >= date_from")
    return d_from, d_to


# ── Journalier ────────────────────────────────────────────────────────────────

@router.get("/daily")
def daily_report(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    result = get_daily_report(db, dt_date.fromisoformat(date))

    # ── Envoi ERP ──────────────────────────────────────────────
    send_report_to_erp(
        report_type="daily",
        payload=result,
        date=date,
    )
    # ───────────────────────────────────────────────────────────

    return result


# ── Hebdomadaire ──────────────────────────────────────────────────────────────

@router.get("/weekly")
def weekly_report(
    week: str = Query(..., pattern=r"^\d{4}-\d{1,2}$", description="YYYY-WW"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    year, w = map(int, week.split("-"))
    if not (1 <= w <= 53):
        raise HTTPException(status_code=422, detail="Numéro de semaine invalide (1-53)")
    result = get_weekly_report(db, year, w)

    # ── Envoi ERP ──────────────────────────────────────────────
    send_report_to_erp(
        report_type="weekly",
        payload=result,
        week=week,
        date_from=result.get("date_from"),
        date_to=result.get("date_to"),
    )
    # ───────────────────────────────────────────────────────────

    return result


# ── Production (OF) ───────────────────────────────────────────────────────────

@router.get("/production")
def production_of_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    d_from, d_to = _parse_range(date_from, date_to)
    result = get_production_of_report(db, d_from, d_to)

    # ── Envoi ERP ──────────────────────────────────────────────
    send_report_to_erp(
        report_type="production-of",
        payload=result,
        date_from=date_from,
        date_to=date_to,
    )
    # ───────────────────────────────────────────────────────────

    return result


# ── Maintenance ───────────────────────────────────────────────────────────────

@router.get("/maintenance")
def maintenance_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    d_from, d_to = _parse_range(date_from, date_to)
    result = get_maintenance_report(db, d_from, d_to)

    # ── Envoi ERP ──────────────────────────────────────────────
    send_report_to_erp(
        report_type="maintenance",
        payload=result,
        date_from=date_from,
        date_to=date_to,
    )
    # ───────────────────────────────────────────────────────────

    return result


# ── Performance (OEE) ─────────────────────────────────────────────────────────

@router.get("/performance")
def performance_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    d_from, d_to = _parse_range(date_from, date_to)
    result = get_performance_report(db, d_from, d_to)

    # ── Envoi ERP ──────────────────────────────────────────────
    send_report_to_erp(
        report_type="performance",
        payload=result,
        date_from=date_from,
        date_to=date_to,
    )
    # ───────────────────────────────────────────────────────────

    return result


# ── Traçabilité ─────────────────────────────────────────────────────────────

@router.get("/traceability")
def traceability_report(
    date_from: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    date_to:   str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
    _: dict = Depends(_require_manager),
):
    d_from, d_to = _parse_range(date_from, date_to)
    result = get_traceability_report(db, d_from, d_to)

    # ── Envoi ERP ──────────────────────────────────────────────
    send_report_to_erp(
        report_type="traceability",
        payload=result,
        date_from=date_from,
        date_to=date_to,
    )
    # ───────────────────────────────────────────────────────────

    return result
    