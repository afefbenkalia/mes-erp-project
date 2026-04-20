import logging
import os

import requests

# ✅ URL lue depuis l'environnement — plus de hardcode localhost
ERP_STOCK_SYNC_URL = os.getenv("ERP_BASE_URL", "http://localhost:8001") + "/api/stock/production-sync"

logger = logging.getLogger(__name__)


def build_erp_payload(production) -> dict:
    """
    Construit le payload attendu par l'ERP.

    Format attendu :
    {
        "production_id": int,
        "consumption": [{"type": "RAW", "name": str, "quantity": float}],
        "production_output": {"type": "FINISHED", "name": str, "quantity": float}
    }
    """
    if not production.fibre:
        raise ValueError(
            f"production.fibre est vide pour production id={production.id} — "
            "impossible de construire le payload de consommation."
        )
    if not production.produit_fini:
        raise ValueError(
            f"production.produit_fini est vide pour production id={production.id} — "
            "impossible de construire le payload de sortie."
        )

    return {
        "production_id": production.id,
        "consumption": [
            {
                "type": "RAW",              # ✅ champ requis par l'ERP (Literal["RAW"])
                "name": production.fibre,   # ✅ "name" — pas "item"
                "quantity": float(production.quantite_matiere_premiere),
            }
        ],
        "production_output": {
            "type": "FINISHED",                 # ✅ champ requis par l'ERP (Literal["FINISHED"])
            "name": production.produit_fini,    # ✅ "name" — pas "item"
            "quantity": float(production.quantite_produit_fini),
        },
    }


def send_production_to_erp(production):
    """
    Envoie une production vers l'ERP pour déclencher la mise à jour du stock.

    Garanties :
    - Ne lève JAMAIS d'exception : le MES ne doit pas crasher si l'ERP est indisponible.
    - Retourne la réponse HTTP si l'appel aboutit, None sinon.
    - Loggue tous les cas d'erreur avec suffisamment de contexte pour déboguer.
    - Appelé UNIQUEMENT après db.commit() + db.refresh() pour garantir production.id.
    """
    # ── Validation du payload avant envoi ────────────────────────────────────
    try:
        payload = build_erp_payload(production)
    except ValueError as exc:
        logger.error("[ERP SYNC] Payload invalide pour production id=%s : %s", production.id, exc)
        print(f"[ERP SYNC] ❌ Payload invalide pour production id={production.id} : {exc}")
        return None

    print(f"[ERP SYNC] → Envoi production id={production.id} vers {ERP_STOCK_SYNC_URL}")
    print(f"[ERP SYNC]   Payload : {payload}")
    logger.info(
        "[ERP SYNC] Envoi production id=%s | produit_fini=%s | fibre=%s | "
        "qte_produit=%.2f | qte_matiere=%.2f",
        production.id,
        production.produit_fini,
        production.fibre,
        float(production.quantite_produit_fini),
        float(production.quantite_matiere_premiere),
    )
    logger.debug("[ERP SYNC] Payload complet production id=%s : %s", production.id, payload)

    # ── Appel HTTP ────────────────────────────────────────────────────────────
    try:
        response = requests.post(ERP_STOCK_SYNC_URL, json=payload, timeout=10)

        print(f"[ERP SYNC] ← Réponse ERP status={response.status_code}")
        print(f"[ERP SYNC]   Body : {response.text}")
        logger.info(
            "[ERP SYNC] Réponse ERP pour production id=%s : status=%s",
            production.id,
            response.status_code,
        )
        logger.debug("[ERP SYNC] Body ERP production id=%s : %s", production.id, response.text)

        if response.status_code == 422:
            logger.error(
                "[ERP SYNC] ❌ Erreur de validation 422 pour production id=%s — "
                "payload=%s — réponse=%s",
                production.id, payload, response.text,
            )
        elif response.status_code >= 400:
            logger.error(
                "[ERP SYNC] ❌ ERP a rejeté la production id=%s status=%s — réponse=%s",
                production.id, response.status_code, response.text,
            )
        else:
            logger.info("[ERP SYNC] ✅ Sync ERP réussie pour production id=%s", production.id)
            print(f"[ERP SYNC] ✅ Stock ERP mis à jour pour production id={production.id}")

        return response

    except requests.exceptions.Timeout:
        logger.error("[ERP SYNC] ⏱ Timeout pour production id=%s (timeout=10s)", production.id)
        print(f"[ERP SYNC] ⏱ Timeout ERP pour production id={production.id}")
        return None

    except requests.exceptions.ConnectionError as exc:
        logger.error("[ERP SYNC] 🔌 ERP injoignable pour production id=%s : %s", production.id, exc)
        print(f"[ERP SYNC] 🔌 ERP injoignable pour production id={production.id} : {exc}")
        return None

    except requests.RequestException as exc:
        logger.exception("[ERP SYNC] ❌ Erreur réseau pour production id=%s", production.id)
        print(f"[ERP SYNC] ❌ Erreur réseau ERP production id={production.id} : {exc}")
        return None

    except Exception as exc:
        logger.exception("[ERP SYNC] ❌ Erreur inattendue pour production id=%s", production.id)
        print(f"[ERP SYNC] ❌ Erreur inattendue ERP production id={production.id} : {exc}")
        return None