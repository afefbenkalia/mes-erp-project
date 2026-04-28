"""
app/modules/dashboard/service.py
"""

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.machines.model import Machine, MachineStateHistory
from app.modules.production.model import (
    EtapeProduction,
    Production,
    Rebut,
    StatutEtape,
)


# ─────────────────────────────────────────────────────────────────────────────
#  HELPER — Availability
# ─────────────────────────────────────────────────────────────────────────────

def _compute_availability(db: Session, since_dt: datetime, now: datetime) -> float:
    machines = db.query(Machine).all()
    if not machines:
        return 88.0

    planned_seconds = (now - since_dt).total_seconds() * len(machines)
    marche_seconds  = 0.0

    for m in machines:
        rows = (
            db.query(MachineStateHistory)
            .filter(
                MachineStateHistory.machine_id == m.id,
                MachineStateHistory.state      == "MARCHE",
                MachineStateHistory.started_at >= since_dt,
            )
            .all()
        )
        for h in rows:
            end = h.ended_at or now
            marche_seconds += max(0.0, (end - h.started_at).total_seconds())

    if planned_seconds <= 0:
        return 88.0
    return round(min(100.0, 100.0 * marche_seconds / planned_seconds), 1)


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 1 — Production par machine  (etapes_production UNIQUEMENT)
# ─────────────────────────────────────────────────────────────────────────────

def _query_production_per_machine(db: Session, target_date: date) -> dict[str, float]:
    """
    SELECT machine, COALESCE(SUM(qte_sortie), 0)
    FROM   etapes_production
    WHERE  statut = 'TERMINE' AND date = :target_date
    GROUP  BY machine
    """
    rows = (
        db.query(
            EtapeProduction.machine.label("machine_code"),
            func.coalesce(func.sum(EtapeProduction.qte_sortie), 0.0).label("production"),
        )
        .filter(
            EtapeProduction.statut == StatutEtape.TERMINE,
            EtapeProduction.date   == target_date,
        )
        .group_by(EtapeProduction.machine)
        .all()
    )
    return {row.machine_code: float(row.production) for row in rows}


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 2 — Rebuts par machine  (rebuts UNIQUEMENT)
# ─────────────────────────────────────────────────────────────────────────────

def _query_rejects_per_machine(db: Session, target_date: date) -> dict[str, float]:
    """
    SELECT machine, COALESCE(SUM(quantite), 0)
    FROM   rebuts
    WHERE  date = :target_date
    GROUP  BY machine
    """
    rows = (
        db.query(
            Rebut.machine.label("machine_code"),
            func.coalesce(func.sum(Rebut.quantite), 0.0).label("rejects"),
        )
        .filter(Rebut.date == target_date)
        .group_by(Rebut.machine)
        .all()
    )
    return {row.machine_code: float(row.rejects) for row in rows}


# ─────────────────────────────────────────────────────────────────────────────
#  STEP 3 — Merge  (union des codes, défaut 0)
# ─────────────────────────────────────────────────────────────────────────────

def _merge_machine_kpis(
    production_map: dict[str, float],
    rejects_map:    dict[str, float],
) -> dict[str, dict]:
    all_codes = set(production_map) | set(rejects_map)
    return {
        code: {
            "production_per_day": round(production_map.get(code, 0.0), 2),
            "rejects_per_day":    round(rejects_map.get(code, 0.0), 2),
        }
        for code in sorted(all_codes)
    }


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_machine_kpis
# ─────────────────────────────────────────────────────────────────────────────

def get_machine_kpis(db: Session) -> dict[str, Any]:
    today = date.today()
    production_map = _query_production_per_machine(db, today)
    rejects_map    = _query_rejects_per_machine(db, today)
    return _merge_machine_kpis(production_map, rejects_map)


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_production_summary  (24h global)
# ─────────────────────────────────────────────────────────────────────────────

def get_production_summary(db: Session) -> dict[str, Any]:
    now        = datetime.now()
    since_dt   = now - timedelta(hours=24)
    since_date = since_dt.date()

    productions = (
        db.query(Production)
        .filter(Production.date >= since_date)
        .all()
    )
    rebuts = (
        db.query(Rebut)
        .filter(Rebut.date >= since_date)
        .all()
    )

    buckets: list[float] = [0.0] * 24
    labels:  list[str]  = []
    for i in range(24):
        labels.append((since_dt + timedelta(hours=i)).strftime("%H:%M"))

    total_q  = 0.0
    total_mp = 0.0
    machine_totals: dict[str, float] = defaultdict(float)

    for p in productions:
        q  = float(p.quantite_produit_fini        or 0)
        mp = float(p.quantite_matiere_premiere     or 0)
        total_q  += q
        total_mp += mp
        machine_totals["GLOBAL"] += q
        dt  = datetime.combine(p.date, datetime.min.time()) + timedelta(hours=12)
        idx = int((dt - since_dt).total_seconds() // 3600)
        if 0 <= idx < 24:
            buckets[idx] += q

    rebut_q = sum(float(r.quantite or 0) for r in rebuts)
    good_q  = max(0.0, total_q - rebut_q)

    quality      = round(100.0 * good_q  / (total_q  + 1e-9) if total_q  > 0 else 100.0, 1)
    rendement    = round(100.0 * total_q / (total_mp + 1e-9) if total_mp > 0 else 100.0, 1)
    availability = _compute_availability(db, since_dt, now)

    mx          = max(buckets) if buckets else 0.0
    avg_hour    = sum(buckets) / 24.0
    performance = round(min(100.0, (avg_hour / mx) * 100.0) if mx > 0 else 82.0, 1)
    oee         = round(
        (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0, 1
    )

    return {
        "kpis": {
            "total_production_24h":       round(total_q,  2),
            "total_matiere_premiere_24h": round(total_mp, 2),
            "rendement":                  rendement,
            "oee":                        oee,
            "availability":               availability,
            "performance":                performance,
            "quality":                    quality,
        },
        "production_by_hour": [
            {"label": labels[i], "quantity": round(buckets[i], 2)}
            for i in range(24)
        ],
        "production_by_machine": [
            {"machine": k, "quantity": round(v, 2)}
            for k, v in sorted(machine_totals.items(), key=lambda x: -x[1])
        ],
        "oee_breakdown": {
            "availability": availability,
            "performance":  performance,
            "quality":      quality,
        },
        "performance_over_time": [
            {
                "label":       labels[i],
                "performance": round(
                    (buckets[i] / (mx + 1e-9)) * 100.0 if mx > 0 else 0.0, 1
                ),
            }
            for i in range(24)
        ],
    }