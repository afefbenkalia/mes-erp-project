from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.modules.production import model


def get_production_summary(db: Session) -> dict[str, Any]:
    now = datetime.now()
    since_dt = now - timedelta(hours=24)
    since_date = since_dt.date()

    productions = (
        db.query(model.Production)
        .filter(model.Production.date >= since_date)
        .all()
    )

    rebuts = (
        db.query(model.Rebut)
        .filter(model.Rebut.date >= since_date)
        .all()
    )

    # ❌ supprimé TempsMachine
    temps_rows = []

    buckets = [0.0] * 24
    labels: list[str] = []

    for i in range(24):
        slot_start = since_dt + timedelta(hours=i)
        labels.append(slot_start.strftime("%H:%M"))

    machine_totals: dict[str, float] = defaultdict(float)
    total_q = 0.0
    total_mp = 0.0

    for p in productions:
        q = float(p.quantite_produit_fini or 0)
        mp = float(p.quantite_matiere_premiere or 0)

        total_q += q
        total_mp += mp

        # ❌ machine supprimée → fallback
        machine_totals["GLOBAL"] += q

        # ❌ debut supprimé → heure fixe (12h)
        h = 12
        dt = datetime.combine(p.date, datetime.min.time()) + timedelta(hours=h)

        idx = int((dt - since_dt).total_seconds() // 3600)
        if 0 <= idx < 24:
            buckets[idx] += q

    rebut_q = sum(float(r.quantite or 0) for r in rebuts)
    good_q = max(0.0, total_q - rebut_q)

    quality = (
        100.0 * good_q / (total_q + 1e-9)
        if total_q > 0 else 100.0
    )
    quality = max(0.0, min(100.0, quality))

    # rendement matière
    rendement = (
        100.0 * total_q / (total_mp + 1e-9)
        if total_mp > 0 else 100.0
    )
    rendement = max(0.0, min(100.0, rendement))

    # ❌ plus de TempsMachine → valeur par défaut
    availability = 88.0

    mx = max(buckets) if buckets else 0.0
    avg_hour = sum(buckets) / 24.0

    if mx > 0:
        performance = min(100.0, (avg_hour / mx) * 100.0)
    else:
        performance = 82.0

    oee = (
        (availability / 100.0)
        * (performance / 100.0)
        * (quality / 100.0)
        * 100.0
    )
    oee = max(0.0, min(100.0, oee))

    perf_over_time = []
    for i in range(24):
        q = buckets[i]
        pt = min(100.0, (q / (mx + 1e-9)) * 100.0) if mx > 0 else 0.0
        perf_over_time.append({
            "label": labels[i],
            "performance": round(pt, 1)
        })

    production_by_hour = [
        {"label": labels[i], "quantity": round(buckets[i], 2)}
        for i in range(24)
    ]

    production_by_machine = [
        {"machine": k, "quantity": round(v, 2)}
        for k, v in sorted(machine_totals.items(), key=lambda x: -x[1])
    ]

    return {
        "kpis": {
            "total_production_24h": round(total_q, 2),
            "total_matiere_premiere_24h": round(total_mp, 2),
            "rendement": round(rendement, 1),
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