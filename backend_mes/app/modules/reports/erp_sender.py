"""
Service MES : envoie les rapports générés vers l'ERP via REST.
Toutes les fonctions sont non-bloquantes (fire-and-log).
"""

import json
import logging
from typing import Any

import httpx

logger = logging.getLogger("mes.erp_sender")

# ── Configuration ─────────────────────────────────────────────────────────────
# L'ERP tourne sur le même poste en local, port 8001
ERP_BASE_URL = "http://127.0.0.1:8001/api"   # ← corrigé (pas erp-service:8001)
ERP_API_KEY  = "MES_SECRET_KEY_CHANGE_ME"    # même clé que dans le router ERP
ERP_TIMEOUT  = 10.0                          # secondes


def _build_period_label(
    report_type: str,
    date: str | None = None,
    week: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> str:
    if report_type == "daily" and date:
        return date
    if report_type == "weekly" and week:
        return week
    if date_from and date_to:
        return f"{date_from}/{date_to}"
    return "unknown"


def send_report_to_erp(
    report_type: str,
    payload: dict[str, Any],
    date: str | None = None,
    week: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sent_by: str = "MES-v2",
) -> bool:
    """
    Envoie un rapport au endpoint ERP POST /api/erp/reports/receive.
    Retourne True si succès, False sinon (ne lève jamais d'exception).
    """
    period_label = _build_period_label(report_type, date, week, date_from, date_to)

    body = {
        "report_type":  report_type,
        "period_label": period_label,
        "date_from":    date_from or date,
        "date_to":      date_to or date,
        "sent_by":      sent_by,
        "payload":      payload,
    }

    try:
        logger.debug(
            "Payload ERP '%s' (%s):\n%s",
            report_type, period_label,
            json.dumps(body, indent=2, default=str),
        )
        response = httpx.post(
            f"{ERP_BASE_URL}/erp/reports/receive",
            json=body,
            headers={
                "x-mes-api-key": ERP_API_KEY,
                "Content-Type":  "application/json",
            },
            timeout=ERP_TIMEOUT,
        )
        if response.status_code == 201:
            logger.info(
                "Rapport '%s' (%s) envoyé à l'ERP — id=%s",
                report_type, period_label, response.json().get("id"),
            )
            return True
        else:
            logger.warning(
                "ERP a rejeté le rapport '%s': status=%s body=%s",
                report_type, response.status_code, response.text[:300],
            )
            return False
    except httpx.RequestError as exc:
        logger.error("Impossible de joindre l'ERP pour '%s': %s", report_type, exc)
        return False