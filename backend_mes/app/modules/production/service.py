"""
service.py – Production MES · Pipeline automatique
Intègre les hooks du module Traçabilité.
"""

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.production import model, schema
from app.modules.production.model import (
    Production, EtapeProduction, HistoriqueProduction,
    StatutProduction, StatutEtape, SEQUENCE_MACHINES,
)
from app.modules.orders.model import OF

# ── IMPORT TRAÇABILITÉ ────────────────────────────────────────────────────────
from app.modules.traceabilite import service as trace_service

ERP_BASE_URL       = "http://127.0.0.1:8001"
ERP_STOCK_ENDPOINT = f"{ERP_BASE_URL}/api/stock/mes/production"

MAPPING_PRODUIT_FINI = {
    "Ruban coton"      : "PF-RUBAN-COTON",
    "Ruban Laine"      : "PF-RUBAN-LAINE",
    "Ruban Polyester"  : "PF-RUBAN-POLYESTER",
    "Ruban Acrylique"  : "PF-RUBAN-ACRYLIQUE",
    "Ruban Lin"        : "PF-RUBAN-LIN",
    "Ruban Soie"       : "PF-RUBAN-SOIE",
}
MAPPING_MP = {
    "Ruban coton"      : "MP-COTON-BRUT",
    "Ruban Laine"      : "MP-LAINE-BRUT",
    "Ruban Polyester"  : "MP-POLYESTER-BRUT",
    "Ruban Acrylique"  : "MP-ACRYLIQUE-BRUT",
    "Ruban Lin"        : "MP-LIN-BRUT",
    "Ruban Soie"       : "MP-SOIE-BRUT",
}

NB_ETAPES = len(SEQUENCE_MACHINES)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _code_pf(produit: str) -> str:
    return MAPPING_PRODUIT_FINI.get(produit, f"PF-{produit.upper().replace(' ', '-')}")


def _code_mp(produit: str) -> str:
    return MAPPING_MP.get(produit, "MP-GENERIQUE")


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


# ── PRODUCTION ────────────────────────────────────────────────────────────────

def create_production(db: Session, data: schema.ProductionCreate) -> Production:
    """
    Lance l'exécution d'un OF :
      1. Crée la Production (statut EN_COURS) avec l'objectif PF
      2. Génère les 11 étapes EN_ATTENTE
      3. Active immédiatement la première étape (EN_COURS)
      4. [TRAÇABILITÉ] Crée le lot de traçabilité associé
    """
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
            machine       = machine_info["code"],
            nom_machine   = machine_info["nom"],
            statut        = statut,
        )
        db.add(etape)

    db.commit()
    db.refresh(prod)

    _add_historique(
        db,
        evenement    = "production_lancee",
        of_id        = prod.of_id,
        production_id= prod.id,
    )

    # ── HOOK TRAÇABILITÉ : création du lot ───────────────────────────────────
    try:
        trace_service.creer_lot(db, prod)
    except Exception as e:
        # La traçabilité ne doit jamais bloquer la production
        print(f"⚠️  Traçabilité – erreur création lot : {e}")
    # ─────────────────────────────────────────────────────────────────────────

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


# ── PIPELINE : avancer ────────────────────────────────────────────────────────

async def avancer_pipeline(
    db           : Session,
    production_id: int,
    data         : schema.EtapeCreate,
) -> schema.PipelineStateResponse:
    """
    Cœur du pipeline automatique :
      1. Récupère l'étape EN_COURS
      2. La valide avec les données de l'opérateur
      3. [TRAÇABILITÉ] Enregistre le snapshot de l'étape
      4. Active automatiquement l'étape suivante
      5. Si dernière étape → Production TERMINÉE + notification ERP
      6. [TRAÇABILITÉ] Clôture le lot et calcule les KPIs finaux
      7. Retourne le nouvel état du pipeline
    """
    prod = get_production(db, production_id)
    if prod.statut == StatutProduction.TERMINE:
        raise HTTPException(status_code=400, detail="Cette production est déjà terminée")

    etape = _get_etape_courante(db, production_id)
    if not etape:
        raise HTTPException(status_code=400, detail="Aucune étape active dans le pipeline")

    # ── Valider l'étape courante ──────────────────────────────────────────────
    etape.qte_entree = data.qte_entree
    etape.qte_sortie = data.qte_sortie
    etape.operateur  = data.operateur
    etape.debut      = data.debut
    etape.fin        = data.fin
    etape.statut     = StatutEtape.TERMINE

    # Règles métier positionnelles
    if etape.ordre == 1:
        prod.quantite_matiere_premiere = data.qte_entree
    if etape.ordre == NB_ETAPES:
        prod.quantite_produit_fini = data.qte_sortie

    db.flush()

    # ── HOOK TRAÇABILITÉ : snapshot de l'étape validée ───────────────────────
    try:
        # Récupérer les rebuts enregistrés pour cette machine sur cette production
        rebuts_etape = (
            db.query(model.Rebut)
            .filter(
                model.Rebut.production_id == production_id,
                model.Rebut.machine       == etape.machine,
            )
            .all()
        )
        trace_service.enregistrer_etape(db, production_id, etape, rebuts_etape)
    except Exception as e:
        print(f"⚠️  Traçabilité – erreur snapshot étape {etape.ordre} : {e}")
    # ─────────────────────────────────────────────────────────────────────────

    # ── Activer l'étape suivante ──────────────────────────────────────────────
    prochaine_etape = (
        db.query(EtapeProduction)
        .filter(
            EtapeProduction.production_id == production_id,
            EtapeProduction.ordre         == etape.ordre + 1,
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

    # ── Fin de production ─────────────────────────────────────────────────────
    if pipeline_termine:
        await _notifier_erp(prod)

        # ── HOOK TRAÇABILITÉ : clôture du lot ────────────────────────────────
        try:
            trace_service.cloturer_lot(db, prod)
        except Exception as e:
            print(f"⚠️  Traçabilité – erreur clôture lot : {e}")
        # ─────────────────────────────────────────────────────────────────────

    _add_historique(
        db,
        evenement                = "etape_validee",
        of_id                    = prod.of_id,
        production_id            = prod.id,
        etape_id                 = etape.id,
        machine                  = etape.machine,
        quantite_produit_fini    = etape.qte_sortie,
        quantite_matiere_premiere= etape.qte_entree,
    )

    # ── Construire la réponse ─────────────────────────────────────────────────
    etape_suivante_info = None
    if prochaine_etape:
        db.refresh(prochaine_etape)
        etape_suivante_info = schema.EtapeResponse.model_validate(prochaine_etape)

    progression = int(
        db.query(EtapeProduction)
        .filter(
            EtapeProduction.production_id == production_id,
            EtapeProduction.statut        == StatutEtape.TERMINE,
        )
        .count()
        / NB_ETAPES
        * 100
    )

    return schema.PipelineStateResponse(
        production_id     = production_id,
        etape_validee     = schema.EtapeResponse.model_validate(etape),
        etape_suivante    = etape_suivante_info,
        pipeline_termine  = pipeline_termine,
        progression       = progression,
        statut_production = prod.statut,
    )


# ── REBUTS ────────────────────────────────────────────────────────────────────

def create_rebut(db: Session, data: schema.RebutCreate):
    """
    Enregistre un rebut et le lie au lot de traçabilité correspondant.
    """
    rebut = model.Rebut(**data.dict())
    db.add(rebut)
    db.commit()
    db.refresh(rebut)

    _add_historique(
        db,
        evenement    = "rebut",
        machine      = rebut.machine,
        production_id= rebut.production_id,
    )

    # ── HOOK TRAÇABILITÉ : liaison rebut ↔ lot ───────────────────────────────
    try:
        trace_service.lier_rebut_lot(db, rebut)
        db.commit()
    except Exception as e:
        print(f"⚠️  Traçabilité – erreur liaison rebut : {e}")
    # ─────────────────────────────────────────────────────────────────────────

    return rebut


def get_all_rebuts(db: Session):
    return db.query(model.Rebut).all()


# ── HISTORIQUE ────────────────────────────────────────────────────────────────

def _add_historique(db: Session, evenement: str, **kwargs):
    hist = HistoriqueProduction(evenement=evenement, **kwargs)
    db.add(hist)
    db.commit()