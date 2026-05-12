"""
app/modules/dashboard/service.py

Performance TRS — OF cycle-time approach  (bug-fix revision v3)
================================================================

Bugs fixed in original revision
─────────────────────────────────
BUG 1 — planned_h accumulated BOTH EN_ATTENTE and TERMINE steps
BUG 2 — cross-OF rate loop iterated all 11 machine codes for every OF
BUG 3 — performance-over-time chart: theoretical side unbounded from step
BUG 4 — runtime_seconds_per_machine keyed by Machine.name, not reference

Bugs fixed in v2
─────────────────
BUG 5 — machine_codes built with m.name instead of m.reference
BUG 6 — _query_production_per_machine filtered on Production.statut == TERMINE

Root cause fixed in THIS revision (v3)
────────────────────────────────────────
BUG 7 — Machine.reference does NOT match EtapeProduction.machine codes

  The DB table `machines` stores commercial names (e.g. "Bobinmatic 3000")
  in both machine.name and machine.reference, while EtapeProduction.machine
  stores the SEQUENCE_MACHINES code (e.g. "CT-BOB-01").  The two sets never
  intersect, so every cross-lookup between state history and production steps
  returned 0 → Performance = 0, OEE = 0, TRS chart empty.

  Fix: introduce _resolve_to_ct_code() which maps any identifier
  (CT-* code, human nom, or commercial reference) to the canonical CT-* code
  via SEQUENCE_MACHINES.  All per-machine dicts now share the same key space.
  The TRS bar chart then maps codes back to human names for display.
"""

from datetime import date, datetime, time, timedelta, timezone
import unicodedata
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session
import statistics

from app.core.datetime_utc import utc_now_naive
from app.modules.machines.model import Machine, MachineStateHistory
from app.modules.production.model import (
    EtapeProduction,
    Production,
    Rebut,
    StatutEtape,
    StatutProduction,
    SEQUENCE_MACHINES,
)

# ─────────────────────────────────────────────────────────────────────────────
#  SEQUENCE HELPERS
# ─────────────────────────────────────────────────────────────────────────────

_CODE_TO_NOM: dict[str, str] = {s["code"]: s["nom"] for s in SEQUENCE_MACHINES}
_NOM_TO_CODE: dict[str, str] = {s["nom"]: s["code"] for s in SEQUENCE_MACHINES}
_NOM_TO_CODE_NORM: dict[str, str] = {
    unicodedata.normalize("NFKD", s["nom"]).encode("ascii", "ignore").decode("ascii").strip().lower(): s["code"]
    for s in SEQUENCE_MACHINES
}
_SEQUENCE_CODES: list[str] = [s["code"] for s in SEQUENCE_MACHINES]
_SEQUENCE_CODE_SET: set[str] = set(_SEQUENCE_CODES)


def _resolve_to_ct_code(raw: str) -> str:
    """Map any machine identifier to a canonical CT-* code if possible."""
    raw = raw.strip()
    if not raw:
        return raw

    raw_up = raw.upper()
    if raw_up in _SEQUENCE_CODE_SET:
        return raw_up

    if raw in _NOM_TO_CODE:
        return _NOM_TO_CODE[raw]

    raw_norm = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode("ascii").strip().lower()
    if raw_norm in _NOM_TO_CODE_NORM:
        return _NOM_TO_CODE_NORM[raw_norm]

    return raw


# ─────────────────────────────────────────────────────────────────────────────
#  LOW-LEVEL HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _to_dt(step_date: date, raw_value: Any) -> datetime | None:
    if raw_value is None:
        return None
    s = str(raw_value).strip()
    if not s:
        return None
    try:
        if "T" in s:
            return datetime.fromisoformat(s)
        if len(s) == 5:
            return datetime.combine(step_date, time.fromisoformat(f"{s}:00"))
        return datetime.combine(step_date, time.fromisoformat(s))
    except (ValueError, TypeError):
        return None


def _clamp_pct(value: float) -> float:
    return max(0.0, min(100.0, value))


def _state_overlap_seconds(
    started_at: datetime,
    ended_at: datetime | None,
    since_dt: datetime,
    now: datetime,
) -> float:
    start = max(started_at, since_dt)
    end = min(ended_at or now, now)
    if end <= start:
        return 0.0
    return (end - start).total_seconds()


def _is_system_artifact(entry: MachineStateHistory) -> bool:
    return (
        entry.ended_at is None
        and str(entry.changed_by or "").strip().lower() == "system"
    )


def _distribute_over_buckets(
    seg_start: datetime,
    seg_end: datetime,
    since_dt: datetime,
    rate_per_hour: float,
    buckets: list[float],
) -> None:
    cur = seg_start
    while cur < seg_end:
        idx = int((cur - since_dt).total_seconds() // 3600)
        if idx < 0:
            cur = since_dt
            continue
        if idx >= 24:
            break
        bucket_end = since_dt + timedelta(hours=idx + 1)
        overlap_end = min(seg_end, bucket_end)
        overlap_s = (overlap_end - cur).total_seconds()
        if overlap_s > 0:
            buckets[idx] += rate_per_hour * (overlap_s / 3600.0)
        cur = overlap_end


# ─────────────────────────────────────────────────────────────────────────────
#  RUNTIME / DOWNTIME
# ─────────────────────────────────────────────────────────────────────────────

def compute_machine_state_seconds(
    db: Session,
    since_dt: datetime,
    now: datetime,
) -> dict[int, dict[str, float]]:
    entries = (
        db.query(MachineStateHistory)
        .filter(
            MachineStateHistory.started_at < now,
            func.coalesce(MachineStateHistory.ended_at, now) > since_dt,
        )
        .all()
    )
    out: dict[int, dict[str, float]] = {}
    for st in entries:
        if _is_system_artifact(st):
            continue
        overlap = _state_overlap_seconds(st.started_at, st.ended_at, since_dt, now)
        if overlap <= 0:
            continue
        bucket = out.setdefault(
            st.machine_id,
            {"runtime_seconds": 0.0, "downtime_seconds": 0.0},
        )
        state = str(st.state or "").strip().upper()
        if state == "MARCHE":
            bucket["runtime_seconds"] += overlap
        elif state in ("PAUSE", "ERREUR", "MAINTENANCE"):
            bucket["downtime_seconds"] += overlap
    return out


# ─────────────────────────────────────────────────────────────────────────────
#  NOMINAL RATES
# ─────────────────────────────────────────────────────────────────────────────

def _compute_of_nominal_rates(
    db: Session,
    prod_ids_in_window: list[int],
    today: date,
) -> dict[str, float]:
    if not prod_ids_in_window:
        return {}

    all_steps = (
        db.query(
            EtapeProduction.production_id,
            EtapeProduction.machine,
            EtapeProduction.qte_sortie,
            EtapeProduction.debut,
            EtapeProduction.fin,
            EtapeProduction.date,
            EtapeProduction.statut,
        )
        .filter(EtapeProduction.production_id.in_(prod_ids_in_window))
        .all()
    )

    productions = (
        db.query(Production.id, Production.quantite_produit_fini)
        .filter(Production.id.in_(prod_ids_in_window))
        .all()
    )
    target_qty: dict[int, float] = {
        p.id: float(p.quantite_produit_fini or 0.0) for p in productions
    }

    planned_h: dict[int, dict[str, float]] = {}
    for step in all_steps:
        if str(step.statut) != str(StatutEtape.EN_ATTENTE):
            continue
        step_date = step.date or today
        debut_dt = _to_dt(step_date, step.debut)
        fin_dt = _to_dt(step_date, step.fin)
        if not debut_dt or not fin_dt or fin_dt <= debut_dt:
            continue
        duration_h = (fin_dt - debut_dt).total_seconds() / 3600.0
        if duration_h <= 0:
            continue
        code = _resolve_to_ct_code(str(step.machine or "").strip())
        if not code:
            continue
        planned_h.setdefault(step.production_id, {})
        planned_h[step.production_id][code] = (
            planned_h[step.production_id].get(code, 0.0) + duration_h
        )

    actual_h: dict[int, dict[str, float]] = {}
    actual_qty_map: dict[int, dict[str, float]] = {}
    for step in all_steps:
        if str(step.statut) != str(StatutEtape.TERMINE):
            continue
        step_date = step.date or today
        debut_dt = _to_dt(step_date, step.debut)
        fin_dt = _to_dt(step_date, step.fin)
        if not debut_dt or not fin_dt or fin_dt <= debut_dt:
            continue
        duration_h = (fin_dt - debut_dt).total_seconds() / 3600.0
        if duration_h <= 0:
            continue
        qty = float(step.qte_sortie or 0.0)
        code = _resolve_to_ct_code(str(step.machine or "").strip())
        if not code:
            continue
        actual_h.setdefault(step.production_id, {})
        actual_qty_map.setdefault(step.production_id, {})
        actual_h[step.production_id][code] = actual_h[step.production_id].get(code, 0.0) + duration_h
        actual_qty_map[step.production_id][code] = actual_qty_map[step.production_id].get(code, 0.0) + qty

    of_machine_codes: dict[int, set[str]] = {}
    for step in all_steps:
        code = _resolve_to_ct_code(str(step.machine or "").strip())
        if code:
            of_machine_codes.setdefault(step.production_id, set()).add(code)

    rate_accum: dict[str, list[float]] = {}
    for pid in prod_ids_in_window:
        tgt = target_qty.get(pid, 0.0)
        for code in of_machine_codes.get(pid, set()):
            ph = (planned_h.get(pid) or {}).get(code, 0.0)
            if ph > 0 and tgt > 0:
                rate_accum.setdefault(code, []).append(tgt / ph)
                continue
            ah = (actual_h.get(pid) or {}).get(code, 0.0)
            aq = (actual_qty_map.get(pid) or {}).get(code, 0.0)
            if ah > 0 and aq > 0:
                rate_accum.setdefault(code, []).append(aq / ah)

    result: dict[str, float] = {}
    for code, rates in rate_accum.items():
        if not rates:
            continue
        try:
            med = statistics.median(rates)
        except Exception:
            med = float(sum(rates) / len(rates))
        result[code] = med
    return result


# ─────────────────────────────────────────────────────────────────────────────
#  STEP HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _query_production_per_machine(
    db: Session, since_dt: datetime, today: date
) -> dict[str, float]:
    rows = (
        db.query(
            EtapeProduction.machine.label("machine_code"),
            EtapeProduction.fin,
            EtapeProduction.date,
            func.coalesce(func.sum(EtapeProduction.qte_sortie), 0.0).label("production"),
        )
        .filter(
            EtapeProduction.statut == StatutEtape.TERMINE,
            EtapeProduction.date >= today,
        )
        .group_by(EtapeProduction.machine, EtapeProduction.fin, EtapeProduction.date)
        .all()
    )
    result: dict[str, float] = {}
    for row in rows:
        fin_dt = _to_dt(row.date or today, row.fin)
        if fin_dt and fin_dt >= since_dt:
            code = _resolve_to_ct_code(str(row.machine_code or "").strip())
            result[code] = result.get(code, 0.0) + float(row.production)
    return result


def _query_rejects_per_machine(
    db: Session, since_dt: datetime, today: date
) -> dict[str, float]:
    rows = (
        db.query(
            Rebut.machine.label("machine_code"),
            func.coalesce(func.sum(Rebut.quantite), 0.0).label("rejects"),
        )
        .filter(Rebut.date >= today)
        .group_by(Rebut.machine)
        .all()
    )
    return {
        _resolve_to_ct_code(str(row.machine_code or "").strip()): float(row.rejects)
        for row in rows
    }


def _merge_machine_kpis(
    production_map: dict[str, float],
    rejects_map: dict[str, float],
) -> dict[str, dict]:
    all_codes = set(production_map) | set(rejects_map)
    return {
        code: {
            "production_per_day": round(production_map.get(code, 0.0), 2),
            "rejects_per_day": round(rejects_map.get(code, 0.0), 2),
        }
        for code in sorted(all_codes)
    }


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_machine_kpis
# ─────────────────────────────────────────────────────────────────────────────

def get_machine_kpis(db: Session) -> dict[str, Any]:
    today = date.today()
    local_now = datetime.now().astimezone()
    midnight_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    since_dt = midnight_local.astimezone(timezone.utc).replace(tzinfo=None)
    production_map = _query_production_per_machine(db, since_dt, today)
    rejects_map = _query_rejects_per_machine(db, since_dt, today)
    return _merge_machine_kpis(production_map, rejects_map)


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_production_summary
# ─────────────────────────────────────────────────────────────────────────────

def get_production_summary(db: Session) -> dict[str, Any]:
    local_now = datetime.now().astimezone()
    midnight_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    since_dt = midnight_local.astimezone(timezone.utc).replace(tzinfo=None)
    now = utc_now_naive()
    since_date = since_dt.date()
    today = since_date

    machines = db.query(Machine).all()
    machine_by_id = {m.id: m for m in machines}

    # ── Completed steps ───────────────────────────────────────────────────────
    completed_steps = (
        db.query(
            EtapeProduction.id,
            EtapeProduction.production_id,
            EtapeProduction.machine,
            EtapeProduction.ordre,
            EtapeProduction.qte_entree,
            EtapeProduction.qte_sortie,
            EtapeProduction.debut,
            EtapeProduction.fin,
            EtapeProduction.date,
            EtapeProduction.statut,
        )
        .filter(
            EtapeProduction.date >= since_date,
            EtapeProduction.statut == StatutEtape.TERMINE,
        )
        .all()
    )

    _events: list[tuple[datetime, float]] = []
    production_ids: set[int] = set()

    for step in completed_steps:
        step_date = step.date or today
        fin_dt = _to_dt(step_date, step.fin)
        if fin_dt is None or fin_dt < since_dt:
            continue
        debut_dt = _to_dt(step_date, step.debut)
        qty_in = float(step.qte_entree or 0.0)
        qty_out = float(step.qte_sortie or 0.0)
        if debut_dt and qty_in > 0:
            _events.append((max(debut_dt, since_dt), qty_in))
        if qty_out > 0:
            _events.append((fin_dt, qty_out))
        production_ids.add(step.production_id)

    _events.sort(key=lambda e: e[0])
    production_by_hour = [
        {"label": ev_dt.strftime("%H:%M"), "quantity": round(qty, 2)}
        for ev_dt, qty in _events
    ]

    prod_ids_in_window = list(production_ids)
    nominal_rate_per_machine = _compute_of_nominal_rates(db, prod_ids_in_window, today)

    # ── Runtime keyed by CT-* code (BUG 7 FIX) ───────────────────────────────
    state_seconds = compute_machine_state_seconds(db, since_dt, now)
    runtime_seconds_total = 0.0
    runtime_seconds_per_machine: dict[str, float] = {}

    for mid, sec in state_seconds.items():
        runtime_seconds_total += sec["runtime_seconds"]
        machine = machine_by_id.get(mid)
        if machine is None:
            continue

        # In this workspace, Machine.name is the canonical CT-* code while
        # Machine.reference is commercial text (e.g. "Alimatic 3000").
        raw_name = str(machine.name or "").strip()
        raw_ref = str(machine.reference or "").strip()
        raw_type = str(machine.machine_type or "").strip()

        ct_code = ""
        for candidate in (raw_name, raw_ref, raw_type):
            if not candidate:
                continue
            resolved = _resolve_to_ct_code(candidate)
            if resolved in _SEQUENCE_CODE_SET:
                ct_code = resolved
                break

        if ct_code:
            runtime_seconds_per_machine[ct_code] = (
                runtime_seconds_per_machine.get(ct_code, 0.0) + sec["runtime_seconds"]
            )

    # ── Actual output keyed by CT-* code ─────────────────────────────────────
    output_per_machine: dict[str, float] = {}
    production_completion: dict[int, datetime] = {}

    for step in completed_steps:
        step_date = step.date or today
        end_dt = _to_dt(step_date, step.fin)
        if end_dt is not None and end_dt < since_dt:
            continue
        if end_dt is None and step_date < since_date:
            continue
        code = _resolve_to_ct_code(str(step.machine or "").strip())
        if not code:
            continue
        qty = float(step.qte_sortie or 0.0)
        output_per_machine[code] = output_per_machine.get(code, 0.0) + qty
        if end_dt is not None:
            prev = production_completion.get(step.production_id)
            if prev is None or end_dt > prev:
                production_completion[step.production_id] = end_dt

    # ── Quality / OEE data ────────────────────────────────────────────────────
    productions_q = []
    if prod_ids_in_window:
        productions_q = (
            db.query(Production)
            .filter(
                Production.id.in_(prod_ids_in_window),
                Production.statut == StatutProduction.TERMINE,
            )
            .all()
        )
    total_q = sum(float(p.quantite_produit_fini or 0.0) for p in productions_q)
    total_mp = sum(float(p.quantite_matiere_premiere or 0.0) for p in productions_q)

    rebuts = []
    if prod_ids_in_window:
        rebuts = (
            db.query(Rebut)
            .filter(Rebut.production_id.in_(prod_ids_in_window))
            .all()
        )
    rebut_q = sum(float(r.quantite or 0.0) for r in rebuts)
    good_q = max(0.0, total_q - rebut_q)

    # ── KPI: Availability ────────────────────────────────────────────────────
    planned_seconds = (now - since_dt).total_seconds() * len(machines) if machines else 0.0
    availability = (
        round(_clamp_pct((runtime_seconds_total / planned_seconds) * 100.0), 1)
        if planned_seconds > 0 else 0.0
    )

    # ── KPI: Performance ─────────────────────────────────────────────────────
    theoretical_output_total = 0.0
    actual_output_total_for_perf = 0.0

    for code, runtime_s in runtime_seconds_per_machine.items():
        rate = nominal_rate_per_machine.get(code, 0.0)
        if rate <= 0:
            continue
        theoretical_output_total += rate * (runtime_s / 3600.0)
        actual_output_total_for_perf += output_per_machine.get(code, 0.0)

    performance = (
        round(
            _clamp_pct(
                (actual_output_total_for_perf / theoretical_output_total) * 100.0
            ),
            1,
        )
        if theoretical_output_total > 0 else 0.0
    )

    # ── KPI: Quality ─────────────────────────────────────────────────────────
    quality = round(_clamp_pct((good_q / total_q) * 100.0), 1) if total_q > 0 else 0.0
    rendement = round(_clamp_pct((total_q / total_mp) * 100.0), 1) if total_mp > 0 else 0.0
    oee = round(
        (availability / 100.0) * (performance / 100.0) * (quality / 100.0) * 100.0, 1
    )

    # ── Per-machine TRS bar chart ─────────────────────────────────────────────
    rejects_per_machine: dict[str, float] = {}
    for r in rebuts:
        code = _resolve_to_ct_code(str(r.machine or "").strip())
        if code:
            rejects_per_machine[code] = rejects_per_machine.get(code, 0.0) + float(r.quantite or 0.0)

    window_seconds = (now - since_dt).total_seconds()

    # Only show machines that have real activity; preserve SEQUENCE_MACHINES order.
    active_codes = set(output_per_machine.keys()) | set(runtime_seconds_per_machine.keys())
    ordered_codes = [c for c in _SEQUENCE_CODES if c in active_codes]
    ordered_codes.extend(sorted(active_codes - _SEQUENCE_CODE_SET))

    production_by_machine = []
    for code in ordered_codes:
        runtime_s = runtime_seconds_per_machine.get(code, 0.0)
        output_q = output_per_machine.get(code, 0.0)
        rejects_q = rejects_per_machine.get(code, 0.0)
        rate = nominal_rate_per_machine.get(code, 0.0)
        theo_q = rate * (runtime_s / 3600.0) if rate > 0 else 0.0

        m_av = _clamp_pct((runtime_s / window_seconds) * 100.0) if window_seconds > 0 else 0.0
        if theo_q > 0:
            m_perf = _clamp_pct((output_q / theo_q) * 100.0)
        elif output_q > 0:
            m_perf = 100.0
        else:
            m_perf = 0.0
        m_qual = (
            _clamp_pct((max(0.0, output_q - rejects_q) / output_q) * 100.0)
            if output_q > 0 else 0.0
        )
        m_oee = round(
            (m_av / 100.0) * (m_perf / 100.0) * (m_qual / 100.0) * 100.0, 1
        )
        production_by_machine.append({
            "machine": _CODE_TO_NOM.get(code, code),   # display human name
            "quantity": m_oee,
        })

    # ── Performance-over-time series ──────────────────────────────────────────
    perf_actual_output: list[float] = [0.0] * 24
    perf_theoretical_output: list[float] = [0.0] * 24
    labels: list[str] = []
    local_midnight = (
        local_now.replace(hour=0, minute=0, second=0, microsecond=0).replace(tzinfo=None)
    )
    for i in range(24):
        labels.append((local_midnight + timedelta(hours=i)).strftime("%H:%M"))

    window_end = since_dt + timedelta(hours=24)

    for step in completed_steps:
        step_date = step.date or today
        start_dt = _to_dt(step_date, step.debut)
        end_dt = _to_dt(step_date, step.fin)
        if not start_dt or not end_dt or end_dt <= start_dt:
            continue
        qty = float(step.qte_sortie or 0.0)
        code = _resolve_to_ct_code(str(step.machine or "").strip())
        if not code:
            continue
        duration_h = (end_dt - start_dt).total_seconds() / 3600.0
        if duration_h <= 0:
            continue
        actual_rate = qty / duration_h if qty > 0 else 0.0
        nominal_rate_m = nominal_rate_per_machine.get(code, 0.0)
        seg_start = max(start_dt, since_dt)
        seg_end = min(end_dt, window_end)
        if seg_end <= seg_start:
            continue
        if actual_rate > 0:
            _distribute_over_buckets(seg_start, seg_end, since_dt, actual_rate, perf_actual_output)
        if nominal_rate_m > 0:
            _distribute_over_buckets(seg_start, seg_end, since_dt, nominal_rate_m, perf_theoretical_output)

    perf_series = [
        {
            "label": labels[i],
            "performance": round(
                _clamp_pct(
                    (perf_actual_output[i] / perf_theoretical_output[i]) * 100.0
                )
                if perf_theoretical_output[i] > 0 else 0.0,
                1,
            ),
        }
        for i in range(24)
    ]

    return {
        "kpis": {
            "total_production_24h": round(total_q, 2),
            "total_matiere_premiere_24h": round(total_mp, 2),
            "rendement": rendement,
            "oee": oee,
            "availability": availability,
            "performance": performance,
            "quality": quality,
        },
        "production_by_hour": production_by_hour,
        "production_by_machine": production_by_machine,
        "oee_breakdown": {
            "availability": availability,
            "performance": performance,
            "quality": quality,
        },
        "performance_over_time": perf_series,
    }


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_productions_list
# ─────────────────────────────────────────────────────────────────────────────

def get_productions_list(db: Session) -> list[dict[str, Any]]:
    today = date.today()
    local_now = datetime.now().astimezone()
    midnight_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    since_dt = midnight_local.astimezone(timezone.utc).replace(tzinfo=None)

    productions_with_steps = (
        db.query(Production.id)
        .join(EtapeProduction, EtapeProduction.production_id == Production.id)
        .filter(
            EtapeProduction.date >= today,
            EtapeProduction.statut == StatutEtape.TERMINE,
        )
        .distinct()
        .all()
    )
    prod_ids_after_midnight = [p.id for p in productions_with_steps]
    valid_prod_ids: set[int] = set()

    if prod_ids_after_midnight:
        steps = (
            db.query(EtapeProduction.production_id, EtapeProduction.fin, EtapeProduction.date)
            .filter(
                EtapeProduction.production_id.in_(prod_ids_after_midnight),
                EtapeProduction.date >= today,
                EtapeProduction.statut == StatutEtape.TERMINE,
            )
            .all()
        )
        for step in steps:
            step_date = step.date or today
            fin_dt = _to_dt(step_date, step.fin)
            if fin_dt and fin_dt >= since_dt:
                valid_prod_ids.add(step.production_id)

    if not valid_prod_ids:
        return []

    productions = (
        db.query(Production.id.label("production_id"), Production.of_numero)
        .filter(Production.id.in_(list(valid_prod_ids)))
        .order_by(Production.id.desc())
        .all()
    )
    return [
        {"production_id": int(p.production_id), "of_numero": str(p.of_numero)}
        for p in productions
    ]


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_scrap_rate_by_of_numero
# ─────────────────────────────────────────────────────────────────────────────

def get_scrap_rate_by_of_numero(db: Session, of_numero: str | None) -> list[dict[str, Any]]:
    if not of_numero:
        return []

    today = date.today()
    local_now = datetime.now().astimezone()
    midnight_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    since_dt = midnight_local.astimezone(timezone.utc).replace(tzinfo=None)

    rows = (
        db.query(
            EtapeProduction.machine,
            EtapeProduction.nom_machine,
            EtapeProduction.qte_entree,
            EtapeProduction.qte_sortie,
            EtapeProduction.ordre,
            EtapeProduction.fin,
            EtapeProduction.date,
        )
        .join(Production, Production.id == EtapeProduction.production_id)
        .filter(
            Production.of_numero == of_numero,
            EtapeProduction.date >= today,
        )
        .all()
    )

    by_machine: dict[str, dict[str, Any]] = {}
    for step in rows:
        step_date = step.date or today
        fin_dt = _to_dt(step_date, step.fin)
        if fin_dt is None or fin_dt < since_dt:
            continue
        machine_code = str(step.machine or "").strip()
        if not machine_code:
            continue
        qte_entree = float(step.qte_entree or 0.0)
        qte_sortie = float(step.qte_sortie or 0.0)
        rebut_total = max(0.0, qte_entree - qte_sortie)
        nom_machine = str(step.nom_machine or machine_code).strip()
        ordre = int(step.ordre or 0)
        bucket = by_machine.setdefault(
            machine_code,
            {
                "machine": machine_code,
                "nom_machine": nom_machine,
                "production_total": 0.0,
                "rebut_total": 0.0,
                "rebut_rate": 0.0,
                "ordre": ordre,
            },
        )
        bucket["production_total"] += qte_sortie
        bucket["rebut_total"] += rebut_total

    result = []
    for data in by_machine.values():
        production_total = float(data["production_total"] or 0.0)
        rebut_total = float(data["rebut_total"] or 0.0)
        data["rebut_rate"] = (
            round((rebut_total / production_total) * 100.0, 2)
            if production_total > 0 else 0.0
        )
        result.append(
            {
                "machine": data["machine"],
                "nom_machine": data["nom_machine"],
                "production_total": round(production_total, 2),
                "rebut_total": round(rebut_total, 2),
                "rebut_rate": round(float(data["rebut_rate"]), 2),
                "ordre": data["ordre"],
            }
        )
    result.sort(key=lambda x: x["ordre"])
    return result


# ─────────────────────────────────────────────────────────────────────────────
#  PUBLIC — get_production_last_24h
# ─────────────────────────────────────────────────────────────────────────────

def get_production_last_24h(
    db: Session, production_id: int | None = None
) -> list[dict[str, Any]]:
    if production_id is None:
        return []

    today = date.today()
    local_now = datetime.now().astimezone()
    midnight_local = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    since_dt = midnight_local.astimezone(timezone.utc).replace(tzinfo=None)

    all_steps = (
        db.query(
            EtapeProduction.machine,
            EtapeProduction.nom_machine,
            EtapeProduction.qte_sortie,
            EtapeProduction.ordre,
            EtapeProduction.fin,
            EtapeProduction.date,
        )
        .filter(
            EtapeProduction.production_id == production_id,
            EtapeProduction.date >= today,
        )
        .all()
    )

    production_by_machine: dict[str, dict[str, Any]] = {}
    for step in all_steps:
        step_date = step.date or today
        fin_dt = _to_dt(step_date, step.fin)
        if fin_dt is None or fin_dt < since_dt:
            continue
        machine_code = str(step.machine or "").strip()
        if not machine_code:
            continue
        qte_sortie = float(step.qte_sortie or 0.0)
        nom_machine = str(step.nom_machine or machine_code).strip()
        ordre = int(step.ordre or 0)
        if machine_code not in production_by_machine:
            production_by_machine[machine_code] = {
                "machine": machine_code,
                "nom_machine": nom_machine,
                "qte_sortie": 0.0,
                "ordre": ordre,
            }
        production_by_machine[machine_code]["qte_sortie"] += qte_sortie

    result = [
        {
            "machine": d["machine"],
            "nom_machine": d["nom_machine"],
            "qte_sortie": round(d["qte_sortie"], 2),
            "ordre": d["ordre"],
        }
        for d in production_by_machine.values()
    ]
    result.sort(key=lambda x: x["ordre"])
    return result