"""Agrégations MES pour le tableau de bord (données issues du module production)."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.modules.production import model


def _parse_debut_hour(debut: str | None) -> int:
    if not debut or not str(debut).strip():
        return 12
    s = str(debut).strip()
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(s, fmt).hour
        except ValueError:
            continue
    return 12


def get_production_summary(db: Session) -> dict[str, Any]:
    now = datetime.now()
    since_dt = now - timedelta(hours=24)
    since_date = since_dt.date()

    productions = (
        db.query(model.Production).filter(model.Production.date >= since_date).all()
    )

    rebuts = db.query(model.Rebut).filter(model.Rebut.date >= since_date).all()
    temps_rows = (
        db.query(model.TempsMachine).filter(model.TempsMachine.date >= since_date).all()
    )

    buckets = [0.0] * 24
    labels: list[str] = []
    for i in range(24):
        slot_start = since_dt + timedelta(hours=i)
        labels.append(slot_start.strftime("%H:%M"))

    machine_totals: dict[str, float] = defaultdict(float)
    total_q = 0.0

    for p in productions:
        total_q += float(p.quantite or 0)
        machine_totals[p.machine or "—"] += float(p.quantite or 0)
        h = _parse_debut_hour(p.debut)
        dt = datetime.combine(p.date, datetime.min.time()) + timedelta(hours=h)
        if dt > now:
            dt = datetime.combine(p.date, datetime.min.time()) + timedelta(hours=12)
        idx = int((dt - since_dt).total_seconds() // 3600)
        if 0 <= idx < 24:
            buckets[idx] += float(p.quantite or 0)

    rebut_q = sum(float(r.quantite or 0) for r in rebuts)
    good_q = max(0.0, total_q - rebut_q)
    quality = (
        100.0 * good_q / (total_q + 1e-9) if total_q > 0 else 100.0
    )
    quality = max(0.0, min(100.0, quality))

    run = sum(float(t.fonctionnement or 0) for t in temps_rows)
    stop = sum(float(t.arret or 0) for t in temps_rows)
    denom = run + stop
    availability = 100.0 * run / (denom + 1e-9) if denom > 0 else 88.0
    availability = max(0.0, min(100.0, availability))

    mx = max(buckets) if buckets else 0.0
    avg_hour = sum(buckets) / 24.0
    if mx > 0:
        performance = min(100.0, (avg_hour / mx) * 100.0)
    else:
        performance = 82.0

    oee = (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0
    oee = max(0.0, min(100.0, oee))

    perf_over_time = []
    for i in range(24):
        q = buckets[i]
        pt = min(100.0, (q / (mx + 1e-9)) * 100.0) if mx > 0 else 0.0
        perf_over_time.append({"label": labels[i], "performance": round(pt, 1)})

    production_by_hour = [
        {"label": labels[i], "quantity": round(buckets[i], 2)} for i in range(24)
    ]

    production_by_machine = [
        {"machine": k, "quantity": round(v, 2)}
        for k, v in sorted(machine_totals.items(), key=lambda x: -x[1])
    ]

    return {
        "kpis": {
            "total_production_24h": round(total_q, 2),
            "oee": round(oee, 1),
            "availability": round(availability, 1),
            "performance": round(performance, 1),
            "quality": round(quality, 1),
        },
        "production_by_hour": production_by_hour,
        "production_by_machine": production_by_machine,
        "oee_breakdown": {
            "availability": round(availability, 1),
            "performance": round(performance, 1),
            "quality": round(quality, 1),
        },
        "performance_over_time": perf_over_time,
    }
