"""
service.py – Production MES · Pipeline automatique
─────────────────────────────────────────────────────────────────────────────
FIX DÉFINITIF :
  La table `machines` a :
    - name      = "CT-ALIM-01"   ← c'est ici que se trouve le code machine
    - reference = "Alimatic 3000" ← c'est le nom commercial

  EtapeProduction.machine = "CT-ALIM-01" (code de SEQUENCE_MACHINES)
  → On cherche donc par Machine.name (et non Machine.reference)

LOGIQUE PIPELINE :
  SI machine.statut IN (PAUSE, ERREUR, MAINTENANCE)
  ET pipeline en cours
  → bloquer l'étape (HTTP 409)
  → générer une alerte détaillée
  → mettre production en pause visuelle (frontend)
  → polling toutes les 5s jusqu'au retour en MARCHE
─────────────────────────────────────────────────────────────────────────────
"""

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.modules.production import model, schema
from app.modules.production.model import (
    Production, EtapeProduction, HistoriqueProduction,
    StatutProduction, StatutEtape, SEQUENCE_MACHINES,
)
from app.modules.orders.model import OF
from app.modules.auth.model import User

# ── Imports machine / maintenance ─────────────────────────────────────────────
try:
    from app.modules.machines.model import Machine, MachineStateHistory
    from app.modules.maintenance.model import MachineOperationalStatus, MachineOperationalState
    _MACHINE_MODELS_AVAILABLE = True
except ImportError:
    _MACHINE_MODELS_AVAILABLE = False
    print("⚠️  Modules machines/maintenance non disponibles")


ERP_BASE_URL       = "http://127.0.0.1:8001"
ERP_STOCK_ENDPOINT = f"{ERP_BASE_URL}/api/stock/mes/production"

NB_ETAPES = len(SEQUENCE_MACHINES)

# États machine qui bloquent le pipeline
_BLOCKING_STATES = {"PAUSE", "ERREUR", "MAINTENANCE"}

# Labels humains pour les messages d'alerte
_STATE_LABELS = {
    "PAUSE":       "à l'arrêt (PAUSE)",
    "ERREUR":      "en panne (ERREUR)",
    "MAINTENANCE": "en maintenance",
}


# ─────────────────────────────────────────────
#  HELPERS INTERNES
# ─────────────────────────────────────────────

def _get_operator_names(db: Session) -> list[str]:
    """Noms complets ('prenom nom') des opérateurs actifs (role='operator')."""
    rows = (
        db.query(User)
        .filter(User.role == "operator", User.is_active == True)
        .order_by(User.nom, User.prenom)
        .all()
    )
    return [f"{u.prenom} {u.nom}" for u in rows]


def _resolve_operator(db: Session, provided: str | None, ordre: int) -> str | None:
    """
    Garantit que l'opérateur enregistré provient bien de la table users (role=operator).

    - Si `provided` correspond à un opérateur réel → on le garde tel quel.
    - Sinon (vide, nom de simulation obsolète, etc.) → on assigne un opérateur réel
      en round-robin selon l'ordre de l'étape.
    - Si aucun opérateur n'existe en base → on retourne `provided` inchangé (fallback).
    """
    valid = _get_operator_names(db)
    if not valid:
        return provided
    name = (provided or "").strip()
    if name in valid:
        return name
    return valid[(ordre - 1) % len(valid)]


def _code_pf(produit: str) -> str:
    p = produit.lower()
    if "coton"      in p: return "PF-RUBAN-COTON"
    if "laine"      in p: return "PF-RUBAN-LAINE"
    if "polyester"  in p: return "PF-RUBAN-POLYESTER"
    if "acrylique"  in p: return "PF-RUBAN-ACRYLIQUE"
    if "lin"        in p: return "PF-RUBAN-LIN"
    if "soie"       in p: return "PF-RUBAN-SOIE"
    return "PF-UNKNOWN"


def _code_mp(produit: str) -> str:
    p = produit.lower()
    if "coton"      in p: return "MP-COTON-BRUT"
    if "laine"      in p: return "MP-LAINE-BRUT"
    if "polyester"  in p: return "MP-POLYESTER-BRUT"
    if "acrylique"  in p: return "MP-ACRYLIQUE-BRUT"
    if "lin"        in p: return "MP-LIN-BRUT"
    if "soie"       in p: return "MP-SOIE-BRUT"
    return "MP-GENERIQUE"


def _get_etape_courante(db: Session, production_id: int) -> EtapeProduction | None:
    """Retourne la première étape non terminée (= étape active du pipeline)."""
    return (
        db.query(EtapeProduction)
        .filter(
            EtapeProduction.production_id == production_id,
            EtapeProduction.statut != StatutEtape.TERMINE,
        )
        .order_by(EtapeProduction.ordre)
        .first()
    )


def _normalize(s: str) -> str:
    return str(s or "").strip().upper()


def _get_machine_state_by_code(db: Session, machine_code: str) -> dict:
    """
    FIX DÉFINITIF : cherche par Machine.name (qui contient "CT-ALIM-01")
    et NON par Machine.reference (qui contient "Alimatic 3000").

    Retourne :
      found        : bool   — machine trouvée en DB
      machine_id   : int|None
      name         : str    — Machine.name (ex: "CT-ALIM-01")
      commercial   : str    — Machine.reference (ex: "Alimatic 3000")
      state        : str    — MARCHE | PAUSE | ERREUR | MAINTENANCE
      is_blocking  : bool   — True si state ∈ {PAUSE, ERREUR, MAINTENANCE}
    """
    if not _MACHINE_MODELS_AVAILABLE:
        return {"found": False, "machine_id": None, "name": machine_code,
                "commercial": None, "state": "MARCHE", "is_blocking": False}

    code = _normalize(machine_code)

    # ── Recherche par Machine.name (= le code technique CT-ALIM-01 etc.) ────
    machine = (
        db.query(Machine)
        .filter(func.upper(func.trim(Machine.name)) == code)
        .first()
    )

    # Fallback Python si la query SQL échoue (pb de collation)
    if not machine:
        for m in db.query(Machine).all():
            if _normalize(m.name) == code:
                machine = m
                break

    if not machine:
        print(f"⚠️  Machine '{code}' introuvable — pipeline non bloqué")
        return {"found": False, "machine_id": None, "name": machine_code,
                "commercial": None, "state": "MARCHE", "is_blocking": False}

    # ── Récupérer MachineOperationalStatus ───────────────────────────────────
    status = (
        db.query(MachineOperationalStatus)
        .filter(MachineOperationalStatus.machine_id == machine.id)
        .first()
    )

    if not status:
        print(f"⚠️  Pas de status pour machine id={machine.id} ('{machine.name}') — MARCHE par défaut")
        return {"found": True, "machine_id": machine.id, "name": machine.name,
                "commercial": machine.reference, "state": "MARCHE", "is_blocking": False}

    # ── Normaliser l'état ─────────────────────────────────────────────────────
    raw = status.state
    state = raw.value if hasattr(raw, "value") else str(raw)
    state = state.strip().upper()
    if "." in state:
        state = state.split(".")[-1]

    is_blocking = state in _BLOCKING_STATES

    print(f"✅ Machine '{machine.name}' ({machine.reference}) — état: {state} — bloquant: {is_blocking}")

    return {
        "found":       True,
        "machine_id":  machine.id,
        "name":        machine.name,        # ex: "CT-ALIM-01"
        "commercial":  machine.reference,   # ex: "Alimatic 3000"
        "state":       state,
        "is_blocking": is_blocking,
    }


async def _notifier_erp(prod: Production):
    payload = {
        "production_id"            : prod.id,
        "of_numero"                : prod.of_numero,
        "code_produit_fini"        : _code_pf(prod.produit_fini),
        "quantite_produit_fini"    : prod.quantite_produit_fini,
        "code_matiere_premiere"    : _code_mp(prod.produit_fini),
        "quantite_matiere_premiere": prod.quantite_matiere_premiere,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(ERP_STOCK_ENDPOINT, json=payload)
            if resp.status_code == 200 and resp.json().get("success"):
                print(f"✅ ERP mis à jour – PF +{prod.quantite_produit_fini} kg")
            else:
                print(f"⚠️  ERP réponse inattendue : {resp.text}")
    except httpx.ConnectError:
        print(f"⚠️  ERP indisponible (production {prod.id})")
    except Exception as e:
        print(f"⚠️  Erreur ERP : {e}")


def _add_historique(db: Session, evenement: str, **kwargs):
    hist = HistoriqueProduction(evenement=evenement, **kwargs)
    db.add(hist)
    db.commit()


# ─────────────────────────────────────────────
#  PRODUCTION
# ─────────────────────────────────────────────

def create_production(db: Session, data: schema.ProductionCreate) -> Production:
    of = db.query(OF).filter(OF.id == data.of_id).first()
    if not of:
        raise HTTPException(status_code=404, detail="OF introuvable")

    existing = db.query(Production).filter(
        Production.of_id == data.of_id,
        Production.statut != StatutProduction.TERMINE,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Production déjà EN_COURS pour l'OF {of.numero} (id={existing.id})",
        )

    prod = Production(
        of_id                 = of.id,
        of_numero             = of.numero,
        produit_fini          = data.produit_fini,
        quantite_produit_fini = data.quantite_produit_fini,
        statut                = StatutProduction.EN_COURS,
    )
    db.add(prod)
    db.flush()

    for i, machine_info in enumerate(SEQUENCE_MACHINES):
        statut = StatutEtape.EN_COURS if i == 0 else StatutEtape.EN_ATTENTE
        etape = EtapeProduction(
            production_id = prod.id,
            ordre         = machine_info["ordre"],
            machine       = machine_info["code"],   # stocke "CT-ALIM-01"
            nom_machine   = machine_info["nom"],
            statut        = statut,
        )
        db.add(etape)

    db.commit()
    db.refresh(prod)

    _add_historique(db, evenement="production_lancee",
                    of_id=prod.of_id, production_id=prod.id)
    return prod


def get_production(db: Session, production_id: int) -> Production:
    prod = db.query(Production).filter(Production.id == production_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Production introuvable")
    return prod


def get_productions(db: Session, of_id: int | None = None):
    q = db.query(Production)
    if of_id:
        q = q.filter(Production.of_id == of_id)
    return q.all()


def get_etapes(db: Session, production_id: int):
    return (
        db.query(EtapeProduction)
        .filter(EtapeProduction.production_id == production_id)
        .order_by(EtapeProduction.ordre)
        .all()
    )


def get_etape_courante(db: Session, production_id: int) -> EtapeProduction:
    etape = _get_etape_courante(db, production_id)
    if not etape:
        raise HTTPException(
            status_code=404,
            detail="Aucune étape active – production terminée ou introuvable",
        )
    return etape


# ─────────────────────────────────────────────
#  VÉRIFICATION ÉTAT MACHINE (endpoint polling)
# ─────────────────────────────────────────────

def check_machine_status_for_production(
    db: Session,
    production_id: int,
) -> schema.MachineStatusCheckResponse:
    """
    GET /{production_id}/machine-status
    Appelé en polling toutes les 5s par le frontend quand pipeline bloqué.
    Ne modifie aucune donnée.
    """
    prod = get_production(db, production_id)

    if prod.statut == StatutProduction.TERMINE:
        return schema.MachineStatusCheckResponse(
            production_id=production_id,
            machine_code=None, machine_name=None,
            machine_state="N/A", is_blocking=False,
            pipeline_can_proceed=True,
            message="Production terminée",
        )

    etape = _get_etape_courante(db, production_id)
    if not etape:
        return schema.MachineStatusCheckResponse(
            production_id=production_id,
            machine_code=None, machine_name=None,
            machine_state="N/A", is_blocking=False,
            pipeline_can_proceed=True,
            message="Aucune étape active",
        )

    info = _get_machine_state_by_code(db, etape.machine)

    if not info["found"]:
        return schema.MachineStatusCheckResponse(
            production_id=production_id,
            machine_code=etape.machine,
            machine_name=etape.nom_machine,
            machine_state="INCONNU",
            is_blocking=False,
            pipeline_can_proceed=True,
            message=f"⚠️ Machine {etape.machine} absente de la DB — pipeline autorisé.",
        )

    is_blocking = info["is_blocking"]
    state       = info["state"]
    display_name = f"{info['name']} ({info['commercial']})" if info.get("commercial") else info["name"]

    if is_blocking:
        reason  = _STATE_LABELS.get(state, f"non opérationnelle ({state})")
        message = (
            f"⚠️ Machine {info['name']} est {reason}. "
            f"Pipeline interrompu — en attente du retour en MARCHE."
        )
    else:
        message = f"✅ Machine {info['name']} opérationnelle — pipeline peut avancer."

    return schema.MachineStatusCheckResponse(
        production_id=production_id,
        machine_code=info["name"],
        machine_name=display_name,
        machine_state=state,
        is_blocking=is_blocking,
        pipeline_can_proceed=not is_blocking,
        message=message,
    )


# ─────────────────────────────────────────────
#  PIPELINE : avancer
# ─────────────────────────────────────────────

async def avancer_pipeline(
    db: Session,
    production_id: int,
    data: schema.EtapeCreate,
) -> schema.PipelineStateResponse:
    """
    LOGIQUE PRINCIPALE :
      1. Vérifier état machine courante
         → PAUSE / ERREUR / MAINTENANCE  → HTTP 409 (bloque le pipeline)
         → MARCHE ou machine inconnue    → continuer
      2. Valider l'étape et avancer
      3. Retourner l'état de la prochaine machine dans la réponse
    """
    prod = get_production(db, production_id)

    if prod.statut == StatutProduction.TERMINE:
        raise HTTPException(status_code=400, detail="Cette production est déjà terminée")

    etape = _get_etape_courante(db, production_id)
    if not etape:
        raise HTTPException(status_code=400, detail="Aucune étape active dans le pipeline")

    # ── CONTRÔLE ÉTAT MACHINE ────────────────────────────────────────────────
    info = _get_machine_state_by_code(db, etape.machine)

    # Bloquer UNIQUEMENT si machine trouvée ET état bloquant
    if info["found"] and info["is_blocking"]:
        state  = info["state"]
        reason = _STATE_LABELS.get(state, f"non opérationnelle ({state})")
        commercial = f" ({info['commercial']})" if info.get("commercial") else ""

        _add_historique(
            db,
            evenement="pipeline_bloque_machine",
            of_id=prod.of_id,
            production_id=prod.id,
            etape_id=etape.id,
            machine=etape.machine,
        )

        raise HTTPException(
            status_code=409,
            detail={
                "code"         : "MACHINE_NOT_READY",
                "machine_code" : info["name"],
                "machine_name" : f"{info['name']}{commercial}",
                "machine_state": state,
                "is_blocking"  : True,
                "message"      : (
                    f"Machine {info['name']}{commercial} est {reason}. "
                    f"Pipeline interrompu — en attente du retour en MARCHE."
                ),
            },
        )

    # ── VALIDATION DE L'ÉTAPE ────────────────────────────────────────────────
    etape.qte_entree = data.qte_entree
    etape.qte_sortie = data.qte_sortie
    # L'opérateur DOIT provenir de la table users (role=operator) — filet de
    # sécurité serveur indépendant de l'état du frontend (cache, simulation…).
    etape.operateur  = _resolve_operator(db, data.operateur, etape.ordre)
    etape.debut      = data.debut
    etape.fin        = data.fin
    etape.statut     = StatutEtape.TERMINE

    if etape.ordre == 1:
        prod.quantite_matiere_premiere = data.qte_entree
    if etape.ordre == NB_ETAPES:
        prod.quantite_produit_fini = data.qte_sortie

    db.flush()

    # Activer l'étape suivante
    prochaine_etape = (
        db.query(EtapeProduction)
        .filter(
            EtapeProduction.production_id == production_id,
            EtapeProduction.ordre == etape.ordre + 1,
        )
        .first()
    )

    pipeline_termine = prochaine_etape is None

    if prochaine_etape:
        prochaine_etape.statut = StatutEtape.EN_COURS
    else:
        prod.statut = StatutProduction.TERMINE

    db.commit()
    db.refresh(prod)

    if pipeline_termine:
        await _notifier_erp(prod)

    _add_historique(
        db,
        evenement="etape_validee",
        of_id=prod.of_id,
        production_id=prod.id,
        etape_id=etape.id,
        machine=etape.machine,
        quantite_produit_fini=etape.qte_sortie,
        quantite_matiere_premiere=etape.qte_entree,
    )

    etape_suivante_info = None
    if prochaine_etape:
        db.refresh(prochaine_etape)
        etape_suivante_info = schema.EtapeResponse.model_validate(prochaine_etape)

    progression = int(
        db.query(EtapeProduction)
        .filter(
            EtapeProduction.production_id == production_id,
            EtapeProduction.statut == StatutEtape.TERMINE,
        )
        .count()
        / NB_ETAPES
        * 100
    )

    # ── État de la PROCHAINE machine (inclus dans la réponse) ────────────────
    next_machine_status = None
    if prochaine_etape:
        next_info     = _get_machine_state_by_code(db, prochaine_etape.machine)
        next_blocking = next_info["found"] and next_info["is_blocking"]
        next_state    = next_info["state"]
        next_commercial = f" ({next_info['commercial']})" if next_info.get("commercial") else ""
        next_display  = f"{next_info['name']}{next_commercial}"

        if next_blocking:
            reason = _STATE_LABELS.get(next_state, f"non opérationnelle ({next_state})")
            msg = (
                f"⚠️ Prochaine machine {next_info['name']}{next_commercial} "
                f"est {reason} — le pipeline sera bloqué à cette étape."
            )
        else:
            msg = f"✅ Prochaine machine {next_info['name']}{next_commercial} opérationnelle."

        next_machine_status = schema.MachineStatusCheckResponse(
            production_id=production_id,
            machine_code=next_info["name"],
            machine_name=next_display,
            machine_state=next_state,
            is_blocking=next_blocking,
            pipeline_can_proceed=not next_blocking,
            message=msg,
        )

    return schema.PipelineStateResponse(
        production_id     = production_id,
        etape_validee     = schema.EtapeResponse.model_validate(etape),
        etape_suivante    = etape_suivante_info,
        pipeline_termine  = pipeline_termine,
        progression       = progression,
        statut_production = prod.statut,
        machine_status    = next_machine_status,
    )


# ─────────────────────────────────────────────
#  REBUTS
# ─────────────────────────────────────────────

def create_rebut(db: Session, data: schema.RebutCreate):
    rebut = model.Rebut(**data.dict())
    db.add(rebut)
    db.commit()
    db.refresh(rebut)
    _add_historique(db, evenement="rebut", machine=rebut.machine,
                    production_id=rebut.production_id)
    return rebut


def get_all_rebuts(db: Session):
    return db.query(model.Rebut).all()