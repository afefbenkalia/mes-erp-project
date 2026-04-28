"""Aggregation logic for the Reports module (read-only queries)."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from typing import Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from sqlalchemy.orm import joinedload

from app.modules.machines.model import Machine, MachineStateHistory
from app.modules.maintenance.model import (
    MaintenanceHistory,
    MaintenanceIntervention,
    MachineOperationalStatus,
)
from app.modules.orders.model import OF
from app.modules.production import model as prod_model
from app.modules.traceability.model import Lot, Step


# ── Shared helpers ────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now()


def _availability_for_window(
    db: Session,
    window_start: datetime,
    window_end: datetime,
    machines: list,
) -> float:
    """MARCHE time / planned time (%), clipped to [window_start, window_end]."""
    window_sec = (window_end - window_start).total_seconds()
    if not machines or window_sec <= 0:
        return 0.0

    marche_sec = 0.0
    for m in machines:
        rows = (
            db.query(MachineStateHistory)
            .filter(
                MachineStateHistory.machine_id == m.id,
                MachineStateHistory.state == "MARCHE",
                or_(
                    MachineStateHistory.ended_at.is_(None),
                    MachineStateHistory.ended_at >= window_start,
                ),
            )
            .all()
        )
        for h in rows:
            s = max(h.started_at, window_start)
            e = min(h.ended_at or window_end, window_end)
            marche_sec += max(0.0, (e - s).total_seconds())

    planned = window_sec * len(machines)
    return round(min(100.0, 100.0 * marche_sec / planned), 1)


def _machine_runtime_for_window(
    db: Session,
    machine: Machine,
    window_start: datetime,
    window_end: datetime,
) -> tuple[float, float]:
    """Returns (runtime_minutes, downtime_minutes) for a single machine in the window."""
    window_sec = (window_end - window_start).total_seconds()
    rows = (
        db.query(MachineStateHistory)
        .filter(
            MachineStateHistory.machine_id == machine.id,
            or_(
                MachineStateHistory.ended_at.is_(None),
                MachineStateHistory.ended_at >= window_start,
            ),
        )
        .all()
    )
    marche_sec = 0.0
    for h in rows:
        if h.state != "MARCHE":
            continue
        s = max(h.started_at, window_start)
        e = min(h.ended_at or window_end, window_end)
        marche_sec += max(0.0, (e - s).total_seconds())

    runtime_min = round(marche_sec / 60, 1)
    downtime_min = round(max(0.0, window_sec - marche_sec) / 60, 1)
    return runtime_min, downtime_min


def _oee(availability: float, performance: float, quality: float) -> float:
    return round(
        max(0.0, min(100.0, (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0)),
        1,
    )


def _parse_date_range(date_from: date, date_to: date) -> tuple[datetime, datetime]:
    """Convert inclusive date range to (window_start, window_end) datetimes."""
    now = _now()
    window_start = datetime.combine(date_from, time.min)
    window_end = min(datetime.combine(date_to + timedelta(days=1), time.min), now)
    return window_start, window_end


def _parse_time_str(s: str, ref_date: date) -> datetime | None:
    """Parse a time/datetime string in multiple formats, fall back to None."""
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%H:%M:%S", "%H:%M"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if fmt in ("%H:%M:%S", "%H:%M"):
                dt = datetime.combine(ref_date, dt.time())
            return dt
        except ValueError:
            continue
    return None


def _etape_duration_minutes(etape: Any) -> float:
    """Compute EtapeProduction step duration in minutes from debut/fin strings."""
    try:
        ref = etape.date or date.today()
        start = _parse_time_str(etape.debut, ref)
        end   = _parse_time_str(etape.fin,   ref)
        if start and end:
            return max(0.0, (end - start).total_seconds() / 60)
    except Exception:
        pass
    return 0.0


# ── Daily report ──────────────────────────────────────────────────────────────

def get_daily_report(db: Session, target_date: date) -> dict[str, Any]:
    now = _now()
    window_start = datetime.combine(target_date, time.min)
    window_end = min(datetime.combine(target_date + timedelta(days=1), time.min), now)

    machines = db.query(Machine).order_by(Machine.name).all()

    # ── Production totals ──
    productions = (
        db.query(prod_model.Production)
        .filter(prod_model.Production.date == target_date)
        .all()
    )
    total_produced = sum(float(p.quantite_produit_fini or 0) for p in productions)
    total_raw_mat  = sum(float(p.quantite_matiere_premiere or 0) for p in productions)
    orders_count   = len(productions)
    orders_completed  = sum(1 for p in productions if p.statut == "TERMINE")
    orders_in_progress = sum(1 for p in productions if p.statut == "EN_COURS")

    # ── Rejects ──
    rebuts = (
        db.query(prod_model.Rebut)
        .join(prod_model.Production, prod_model.Production.id == prod_model.Rebut.production_id)
        .filter(prod_model.Production.date == target_date)
        .all()
    )
    total_rejects = sum(float(r.quantite or 0) for r in rebuts)

    # Per-defect breakdown
    defaut_map: dict[str, float] = defaultdict(float)
    for r in rebuts:
        key = r.defaut or "Inconnu"
        defaut_map[key] += float(r.quantite or 0)
    reject_breakdown = [
        {"defaut": k, "quantite": round(v, 2)}
        for k, v in sorted(defaut_map.items(), key=lambda x: -x[1])
    ]

    # ── Per-machine production (EtapeProduction) ──
    etape_rows = (
        db.query(
            prod_model.EtapeProduction.machine,
            prod_model.EtapeProduction.nom_machine,
            func.coalesce(func.sum(prod_model.EtapeProduction.qte_sortie), 0).label("produced"),
        )
        .join(prod_model.Production, prod_model.Production.id == prod_model.EtapeProduction.production_id)
        .filter(prod_model.Production.date == target_date)
        .group_by(prod_model.EtapeProduction.machine, prod_model.EtapeProduction.nom_machine)
        .all()
    )
    # Per-machine rejects
    rej_by_machine: dict[str, float] = defaultdict(float)
    for r in rebuts:
        if r.machine:
            rej_by_machine[r.machine] += float(r.quantite or 0)

    production_by_machine = [
        {
            "machine_code": row.machine or "",
            "machine_name": row.nom_machine or "",
            "produced": round(float(row.produced), 2),
            "rejects": round(rej_by_machine.get(row.machine, 0.0), 2),
        }
        for row in etape_rows
    ]

    # ── OEE ──
    rendement_pct = round(
        min(100.0, 100.0 * total_produced / total_raw_mat) if total_raw_mat > 0 else 100.0, 1
    )
    good_q = max(0.0, total_produced - total_rejects)
    quality = round(
        min(100.0, 100.0 * good_q / total_produced) if total_produced > 0 else 100.0, 1
    )
    availability = _availability_for_window(db, window_start, window_end, machines)

    # Performance: avg produced per machine vs. top machine
    machine_produced = [row.produced for row in etape_rows if row.produced and row.produced > 0]
    if machine_produced:
        avg_prod = sum(float(v) for v in machine_produced) / len(machine_produced)
        max_prod = max(float(v) for v in machine_produced)
        performance = round(min(100.0, 100.0 * avg_prod / max_prod) if max_prod > 0 else 82.0, 1)
    else:
        performance = 82.0

    oee_val = _oee(availability, performance, quality)

    # ── Per-machine state & runtime ──
    status_map = {
        s.machine_id: s.state
        for s in db.query(MachineOperationalStatus).all()
    }
    machines_out = []
    for m in machines:
        runtime_min, downtime_min = _machine_runtime_for_window(db, m, window_start, window_end)
        window_min = (window_end - window_start).total_seconds() / 60
        avail_pct = round(100.0 * runtime_min / window_min, 1) if window_min > 0 else 0.0
        machines_out.append({
            "name": m.name,
            "reference": m.reference,
            "machine_type": m.machine_type,
            "current_state": str(status_map.get(m.id, "INCONNU")),
            "runtime_minutes": runtime_min,
            "downtime_minutes": downtime_min,
            "availability_pct": avail_pct,
        })

    return {
        "date": target_date.isoformat(),
        "production": {
            "total_produced": round(total_produced, 2),
            "total_raw_material": round(total_raw_mat, 2),
            "total_rejects": round(total_rejects, 2),
            "rendement_pct": rendement_pct,
            "orders_count": orders_count,
            "orders_completed": orders_completed,
            "orders_in_progress": orders_in_progress,
        },
        "oee": {
            "availability": availability,
            "performance": performance,
            "quality": quality,
            "oee": oee_val,
        },
        "production_by_machine": production_by_machine,
        "reject_breakdown": reject_breakdown,
        "machines": machines_out,
    }


# ── Weekly report ─────────────────────────────────────────────────────────────

def get_weekly_report(db: Session, year: int, week: int) -> dict[str, Any]:
    now = _now()
    try:
        day_from = date.fromisocalendar(year, week, 1)  # Monday
        day_to   = date.fromisocalendar(year, week, 7)  # Sunday
    except ValueError:
        # Invalid ISO week — return empty structure
        return {
            "week": f"{year}-W{week:02d}",
            "date_from": None,
            "date_to": None,
            "summary": {},
            "daily_breakdown": [],
            "machines_most_down": [],
            "production_by_machine": [],
        }

    week_start = datetime.combine(day_from, time.min)
    week_end   = min(datetime.combine(day_to + timedelta(days=1), time.min), now)

    machines = db.query(Machine).order_by(Machine.name).all()

    # ── Productions for the week ──
    productions = (
        db.query(prod_model.Production)
        .filter(
            prod_model.Production.date >= day_from,
            prod_model.Production.date <= day_to,
        )
        .all()
    )
    prod_by_date: dict[date, float] = defaultdict(float)
    for p in productions:
        prod_by_date[p.date] += float(p.quantite_produit_fini or 0)
    total_produced = sum(prod_by_date.values())

    # ── Rejects for the week ──
    rebuts = (
        db.query(prod_model.Rebut)
        .join(prod_model.Production, prod_model.Production.id == prod_model.Rebut.production_id)
        .filter(
            prod_model.Production.date >= day_from,
            prod_model.Production.date <= day_to,
        )
        .all()
    )
    rej_by_date: dict[date, float] = defaultdict(float)
    for r in rebuts:
        pdate = next(
            (p.date for p in productions if p.id == r.production_id),
            None,
        )
        if pdate:
            rej_by_date[pdate] += float(r.quantite or 0)
    total_rejects = sum(rej_by_date.values())

    # ── Per-machine production for the week ──
    etape_rows = (
        db.query(
            prod_model.EtapeProduction.machine,
            prod_model.EtapeProduction.nom_machine,
            func.coalesce(func.sum(prod_model.EtapeProduction.qte_sortie), 0).label("produced"),
        )
        .join(prod_model.Production, prod_model.Production.id == prod_model.EtapeProduction.production_id)
        .filter(
            prod_model.Production.date >= day_from,
            prod_model.Production.date <= day_to,
        )
        .group_by(prod_model.EtapeProduction.machine, prod_model.EtapeProduction.nom_machine)
        .all()
    )
    rej_by_machine_week: dict[str, float] = defaultdict(float)
    for r in rebuts:
        if r.machine:
            rej_by_machine_week[r.machine] += float(r.quantite or 0)

    production_by_machine = [
        {
            "machine_code": row.machine or "",
            "machine_name": row.nom_machine or "",
            "produced": round(float(row.produced), 2),
            "rejects": round(rej_by_machine_week.get(row.machine, 0.0), 2),
        }
        for row in etape_rows
    ]

    # ── Daily breakdown (Mon→Sun) ──
    daily_breakdown = []
    daily_oees: list[float] = []
    daily_availabilities: list[float] = []

    for offset in range(7):
        d = day_from + timedelta(days=offset)
        d_start = datetime.combine(d, time.min)
        d_end   = min(datetime.combine(d + timedelta(days=1), time.min), now)

        if d_end <= d_start:
            daily_breakdown.append({
                "date": d.isoformat(),
                "produced": 0.0,
                "rejects": 0.0,
                "availability": 0.0,
                "oee": 0.0,
            })
            continue

        d_prod = round(prod_by_date.get(d, 0.0), 2)
        d_rej  = round(rej_by_date.get(d, 0.0), 2)

        d_avail = _availability_for_window(db, d_start, d_end, machines)
        good = max(0.0, d_prod - d_rej)
        d_quality = round(min(100.0, 100.0 * good / d_prod) if d_prod > 0 else 100.0, 1)
        d_oee = _oee(d_avail, 82.0, d_quality)  # performance fixed at 82 for daily slices

        daily_oees.append(d_oee)
        daily_availabilities.append(d_avail)
        daily_breakdown.append({
            "date": d.isoformat(),
            "produced": d_prod,
            "rejects": d_rej,
            "availability": d_avail,
            "oee": d_oee,
        })

    avg_oee = round(sum(daily_oees) / len(daily_oees), 1) if daily_oees else 0.0
    avg_availability = round(sum(daily_availabilities) / len(daily_availabilities), 1) if daily_availabilities else 0.0

    # ── Total runtime / downtime for the week ──
    week_window_sec = (week_end - week_start).total_seconds()
    total_marche_sec = 0.0
    machines_down: list[dict] = []

    for m in machines:
        _, downtime_min = _machine_runtime_for_window(db, m, week_start, week_end)
        runtime_min, _ = _machine_runtime_for_window(db, m, week_start, week_end)
        total_marche_sec += runtime_min * 60
        week_min = week_window_sec / 60
        down_pct = round(100.0 * downtime_min / week_min, 1) if week_min > 0 else 0.0
        machines_down.append({
            "name": m.name,
            "reference": m.reference,
            "downtime_minutes": downtime_min,
            "downtime_pct": down_pct,
        })

    machines_down.sort(key=lambda x: -x["downtime_minutes"])
    machines_most_down = machines_down[:5]

    total_runtime_hours  = round(total_marche_sec / 3600, 1)
    total_downtime_hours = round(max(0.0, week_window_sec * len(machines) - total_marche_sec) / 3600, 1)

    return {
        "week": f"{year}-W{week:02d}",
        "date_from": day_from.isoformat(),
        "date_to": day_to.isoformat(),
        "summary": {
            "total_produced": round(total_produced, 2),
            "total_rejects": round(total_rejects, 2),
            "avg_oee": avg_oee,
            "avg_availability": avg_availability,
            "total_runtime_hours": total_runtime_hours,
            "total_downtime_hours": total_downtime_hours,
        },
        "daily_breakdown": daily_breakdown,
        "machines_most_down": machines_most_down,
        "production_by_machine": production_by_machine,
    }


# ── Production par OF ─────────────────────────────────────────────────────────

def get_production_of_report(db: Session, date_from: date, date_to: date) -> dict[str, Any]:
    # 3 bulk queries — no N+1
    productions_with_of = (
        db.query(prod_model.Production, OF)
        .join(OF, OF.id == prod_model.Production.of_id)
        .filter(
            prod_model.Production.date >= date_from,
            prod_model.Production.date <= date_to,
        )
        .all()
    )

    prod_ids = [p.id for p, _ in productions_with_of]

    etapes_by_prod: dict[int, list] = defaultdict(list)
    if prod_ids:
        for e in (
            db.query(prod_model.EtapeProduction)
            .filter(prod_model.EtapeProduction.production_id.in_(prod_ids))
            .order_by(prod_model.EtapeProduction.production_id, prod_model.EtapeProduction.ordre)
            .all()
        ):
            etapes_by_prod[e.production_id].append(e)

    rejects_by_prod: dict[int, float] = defaultdict(float)
    if prod_ids:
        for r in (
            db.query(prod_model.Rebut)
            .filter(prod_model.Rebut.production_id.in_(prod_ids))
            .all()
        ):
            rejects_by_prod[r.production_id] += float(r.quantite or 0)

    of_rows = []
    total_produced = total_rejects = total_cible = 0.0
    for prod, of in productions_with_of:
        rejets   = rejects_by_prod[prod.id]
        produced = float(prod.quantite_produit_fini or 0)
        cible    = float(of.quantite or 0)
        conforme = max(0.0, produced - rejets)
        duration = sum(_etape_duration_minutes(e) for e in etapes_by_prod[prod.id])
        taux     = round(100.0 * rejets / produced, 1) if produced > 0 else 0.0
        statut   = prod.statut.value if hasattr(prod.statut, "value") else str(prod.statut)
        total_produced += produced
        total_rejects  += rejets
        total_cible    += cible
        of_rows.append({
            "of_numero":          prod.of_numero,
            "produit":            prod.produit_fini,
            "date":               prod.date.isoformat(),
            "statut":             statut,
            "quantite_cible":     round(cible, 0),
            "quantite_produite":  round(produced, 2),
            "quantite_conforme":  round(conforme, 2),
            "rejets":             round(rejets, 2),
            "taux_rejet_pct":     taux,
            "duree_minutes":      round(duration, 1),
        })
    of_rows.sort(key=lambda x: x["date"])

    return {
        "date_from": date_from.isoformat(),
        "date_to":   date_to.isoformat(),
        "summary": {
            "total_of":               len(of_rows),
            "of_termines":            sum(1 for r in of_rows if r["statut"] == "TERMINE"),
            "of_en_cours":            sum(1 for r in of_rows if r["statut"] == "EN_COURS"),
            "total_produit":          round(total_produced, 2),
            "total_rejects":          round(total_rejects, 2),
            "taux_rejet_global_pct":  round(100.0 * total_rejects / total_produced, 1) if total_produced > 0 else 0.0,
            "total_cible":            round(total_cible, 0),
        },
        "of_rows": of_rows,
    }


# ── Maintenance ───────────────────────────────────────────────────────────────

def get_maintenance_report(db: Session, date_from: date, date_to: date) -> dict[str, Any]:
    window_start, window_end = _parse_date_range(date_from, date_to)

    history_rows = (
        db.query(MaintenanceHistory, Machine)
        .join(Machine, Machine.id == MaintenanceHistory.machine_id)
        .filter(
            MaintenanceHistory.date >= window_start,
            MaintenanceHistory.date < window_end,
        )
        .order_by(MaintenanceHistory.date.desc())
        .all()
    )

    open_count = (
        db.query(MaintenanceIntervention)
        .filter(
            MaintenanceIntervention.start_time >= window_start,
            MaintenanceIntervention.start_time < window_end,
        )
        .count()
    )

    machine_impact: dict[int, dict] = {}
    for hist, machine in history_rows:
        mid = machine.id
        if mid not in machine_impact:
            machine_impact[mid] = {
                "machine_name":      machine.name,
                "machine_reference": machine.reference,
                "total_duration_sec": 0,
                "interventions":     0,
            }
        machine_impact[mid]["total_duration_sec"] += hist.duration_seconds or 0
        machine_impact[mid]["interventions"]      += 1

    machines_most_impacted = sorted(
        [
            {
                "machine_name":      v["machine_name"],
                "machine_reference": v["machine_reference"],
                "interventions":     v["interventions"],
                "total_hours":       round(v["total_duration_sec"] / 3600, 1),
            }
            for v in machine_impact.values()
        ],
        key=lambda x: -x["total_hours"],
    )[:10]

    history_out = [
        {
            "date":               h.date.isoformat(),
            "machine_name":       m.name,
            "machine_reference":  m.reference,
            "technician":         h.technician,
            "duration_minutes":   round((h.duration_seconds or 0) / 60, 1),
            "action_effectuee":   h.action_effectuee or "",
        }
        for h, m in history_rows
    ]

    total_sec = sum(h.duration_seconds or 0 for h, _ in history_rows)
    n = len(history_rows)
    return {
        "date_from": date_from.isoformat(),
        "date_to":   date_to.isoformat(),
        "summary": {
            "total_interventions":   n,
            "total_hours":           round(total_sec / 3600, 1),
            "machines_affected":     len(machine_impact),
            "avg_duration_minutes":  round(total_sec / 60 / n, 1) if n else 0.0,
            "open_interventions":    open_count,
        },
        "machines_most_impacted": machines_most_impacted,
        "history":                history_out,
    }


# ── Performance (OEE) ─────────────────────────────────────────────────────────

def get_performance_report(db: Session, date_from: date, date_to: date) -> dict[str, Any]:
    window_start, window_end = _parse_date_range(date_from, date_to)
    machines = db.query(Machine).order_by(Machine.name).all()

    global_avail = _availability_for_window(db, window_start, window_end, machines)

    productions = (
        db.query(prod_model.Production)
        .filter(
            prod_model.Production.date >= date_from,
            prod_model.Production.date <= date_to,
        )
        .all()
    )
    total_produced = sum(float(p.quantite_produit_fini or 0) for p in productions)
    total_raw      = sum(float(p.quantite_matiere_premiere or 0) for p in productions)

    rebuts = (
        db.query(prod_model.Rebut)
        .join(prod_model.Production, prod_model.Production.id == prod_model.Rebut.production_id)
        .filter(
            prod_model.Production.date >= date_from,
            prod_model.Production.date <= date_to,
        )
        .all()
    )
    total_rejects  = sum(float(r.quantite or 0) for r in rebuts)

    good             = max(0.0, total_produced - total_rejects)
    global_quality   = round(min(100.0, 100.0 * good / total_produced) if total_produced > 0 else 100.0, 1)
    global_perf      = round(min(100.0, 100.0 * total_produced / total_raw) if total_raw > 0 else 82.0, 1)
    global_oee_val   = _oee(global_avail, global_perf, global_quality)

    status_map = {s.machine_id: s.state for s in db.query(MachineOperationalStatus).all()}
    window_min = (window_end - window_start).total_seconds() / 60

    per_machine = []
    for m in machines:
        runtime_min, downtime_min = _machine_runtime_for_window(db, m, window_start, window_end)
        m_avail = round(100.0 * runtime_min / window_min, 1) if window_min > 0 else 0.0
        m_oee   = _oee(m_avail, global_perf, global_quality)
        per_machine.append({
            "machine_name":      m.name,
            "machine_reference": m.reference,
            "machine_type":      m.machine_type,
            "current_state":     str(status_map.get(m.id, "INCONNU")),
            "availability_pct":  m_avail,
            "runtime_minutes":   runtime_min,
            "downtime_minutes":  downtime_min,
            "oee":               m_oee,
        })
    per_machine.sort(key=lambda x: -x["oee"])

    # Daily trend — only when range ≤ 31 days
    num_days = (date_to - date_from).days + 1
    trend: list[dict] = []
    if num_days <= 31:
        prod_by_date: dict[date, float] = defaultdict(float)
        for p in productions:
            prod_by_date[p.date] += float(p.quantite_produit_fini or 0)
        prod_date_map = {p.id: p.date for p in productions}
        rej_by_date: dict[date, float] = defaultdict(float)
        for r in rebuts:
            d = prod_date_map.get(r.production_id)
            if d:
                rej_by_date[d] += float(r.quantite or 0)
        for offset in range(num_days):
            d       = date_from + timedelta(days=offset)
            d_start = datetime.combine(d, time.min)
            d_end   = min(datetime.combine(d + timedelta(days=1), time.min), window_end)
            if d_end <= d_start:
                continue
            d_prod    = prod_by_date.get(d, 0.0)
            d_rej     = rej_by_date.get(d, 0.0)
            d_avail   = _availability_for_window(db, d_start, d_end, machines)
            d_good    = max(0.0, d_prod - d_rej)
            d_quality = round(min(100.0, 100.0 * d_good / d_prod) if d_prod > 0 else 100.0, 1)
            d_oee     = _oee(d_avail, 82.0, d_quality)
            trend.append({"date": d.isoformat(), "availability": d_avail, "oee": d_oee, "produced": round(d_prod, 2)})

    return {
        "date_from": date_from.isoformat(),
        "date_to":   date_to.isoformat(),
        "summary": {
            "global_oee":     global_oee_val,
            "availability":   global_avail,
            "performance":    global_perf,
            "quality":        global_quality,
            "total_produced": round(total_produced, 2),
            "total_rejects":  round(total_rejects, 2),
            "machines_count": len(machines),
        },
        "per_machine": per_machine,
        "trend":       trend,
    }


# ── Traçabilité ───────────────────────────────────────────────────────────────

def get_traceability_report(db: Session, date_from: date, date_to: date) -> dict[str, Any]:
    num_days = (date_to - date_from).days + 1

    if num_days <= 31:
        date_prefixes = [
            (date_from + timedelta(days=i)).isoformat()
            for i in range(num_days)
        ]
        like_filters = [Lot.date_creation.like(f"{prefix}%") for prefix in date_prefixes]
        lots = (
            db.query(Lot)
            .options(joinedload(Lot.steps))
            .filter(or_(*like_filters))
            .all()
        )
    else:
        d_from_str = date_from.isoformat()
        d_to_str   = date_to.isoformat()
        all_lots   = db.query(Lot).options(joinedload(Lot.steps)).all()
        lots = [
            lot for lot in all_lots
            if lot.date_creation and d_from_str <= lot.date_creation[:10] <= d_to_str
        ]

    all_steps    = [s for lot in lots for s in (lot.steps or [])]
    machines_set = {s.machine for s in all_steps if s.machine}

    lot_rows = []
    for lot in lots:
        init = lot.quantite_initiale or 0
        fin  = lot.quantite_finale   or 0
        rend = round(100.0 * fin / init, 1) if init > 0 else 0.0
        lot_rows.append({
            "numero_lot":        lot.numero_lot,
            "produit":           lot.produit,
            "ordre_id":          lot.ordre_id or "",
            "date_creation":     lot.date_creation or "",
            "statut":            lot.status or "",
            "quantite_initiale": init,
            "quantite_finale":   fin,
            "rendement_pct":     rend,
            "steps": [
                {
                    "operation": s.operation,
                    "machine":   s.machine   or "—",
                    "operateur": s.operateur or "—",
                    "statut":    s.status    or "",
                    "duree_min": s.duree_min or 0,
                    "quantite":  s.quantite  or 0,
                }
                for s in sorted(lot.steps or [], key=lambda x: x.id)
            ],
        })
    lot_rows.sort(key=lambda x: x["date_creation"], reverse=True)

    return {
        "date_from": date_from.isoformat(),
        "date_to":   date_to.isoformat(),
        "summary": {
            "total_lots":        len(lots),
            "total_steps":       len(all_steps),
            "machines_used":     len(machines_set),
            "lots_completed":    sum(1 for lot in lots if lot.status == "completed"),
            "lots_in_progress":  sum(1 for lot in lots if lot.status == "running"),
        },
        "lots": lot_rows,
    }
