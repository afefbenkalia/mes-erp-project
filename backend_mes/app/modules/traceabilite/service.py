"""
service.py – Traçabilité MES

Responsabilités :
  1. Créer automatiquement un LotTraceabilite au lancement d'une Production
  2. Enregistrer un snapshot EtapeTraceabilite à chaque validation d'étape
  3. Lier les Rebuts au lot (RebutTraceabilite)
  4. Déclencher des AlerteQualite si les seuils sont dépassés
  5. Écrire chaque action dans le journal EvenementTraceabilite
  6. Clôturer le lot et calculer les KPIs finaux en fin de production
  7. Générer un RapportTraceabilite exportable

Ce service est appelé DEPUIS production/service.py via des hooks,
sans modifier la logique pipeline existante.
"""

from datetime import datetime
from typing import Optional
from collections import defaultdict
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.traceabilite.model import (
    LotTraceabilite, EtapeTraceabilite, RebutTraceabilite,
    EvenementTraceabilite, AlerteQualite,
    StatutLot, TypeEvenement, NiveauAlerte,
)
from app.modules.traceabilite import schema
from app.modules.production.model import (
    Production, EtapeProduction, Rebut, SEQUENCE_MACHINES,
)

# ─── Seuils qualité (configurables) ─────────────────────────────────────────
SEUIL_RENDEMENT_ALERTE    = 90.0   # % — en-dessous → AVERTISSEMENT
SEUIL_RENDEMENT_CRITIQUE  = 80.0   # % — en-dessous → CRITIQUE
SEUIL_REBUT_PCT           = 5.0    # % de qte_entree → AVERTISSEMENT

MAPPING_PRODUIT_FINI = {
    "Ruban coton"     : "PF-RUBAN-COTON",
    "Ruban Laine"     : "PF-RUBAN-LAINE",
    "Ruban Polyester" : "PF-RUBAN-POLYESTER",
    "Ruban Acrylique" : "PF-RUBAN-ACRYLIQUE",
    "Ruban Lin"       : "PF-RUBAN-LIN",
    "Ruban Soie"      : "PF-RUBAN-SOIE",
}
MAPPING_MP = {
    "Ruban coton"     : "MP-COTON-BRUT",
    "Ruban Laine"     : "MP-LAINE-BRUT",
    "Ruban Polyester" : "MP-POLYESTER-BRUT",
    "Ruban Acrylique" : "MP-ACRYLIQUE-BRUT",
    "Ruban Lin"       : "MP-LIN-BRUT",
    "Ruban Soie"      : "MP-SOIE-BRUT",
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generer_numero_lot(of_numero: str, production_id: int) -> str:
    """Format : LOT-{OF_NUMERO}-{PROD_ID}-{YYMMDD}-{4hex}"""
    today = datetime.utcnow().strftime("%y%m%d")
    suffix = uuid.uuid4().hex[:4].upper()
    return f"LOT-{of_numero}-{production_id}-{today}-{suffix}"


def _calc_rendement(qte_entree: Optional[float], qte_sortie: Optional[float]) -> Optional[float]:
    if qte_entree and qte_entree > 0 and qte_sortie is not None:
        return round((qte_sortie / qte_entree) * 100, 2)
    return None


def _calc_duree(debut: Optional[str], fin: Optional[str]) -> Optional[int]:
    """Convertit HH:MM → durée en minutes (suppose même journée)."""
    if not debut or not fin:
        return None
    try:
        h1, m1 = map(int, debut.split(":"))
        h2, m2 = map(int, fin.split(":"))
        duree = (h2 * 60 + m2) - (h1 * 60 + m1)
        return duree if duree >= 0 else None
    except Exception:
        return None


def _ajouter_evenement(
    db: Session,
    lot: LotTraceabilite,
    type_ev: TypeEvenement,
    description: str,
    machine: Optional[str] = None,
    operateur: Optional[str] = None,
    valeur_avant: Optional[float] = None,
    valeur_apres: Optional[float] = None,
    metadata: Optional[dict] = None,
):
    ev = EvenementTraceabilite(
        lot_id         = lot.id,
        type_evenement = type_ev,
        description    = description,
        machine        = machine,
        operateur      = operateur,
        valeur_avant   = valeur_avant,
        valeur_apres   = valeur_apres,
        horodatage     = datetime.utcnow(),
        metadata_json  = metadata,
    )
    db.add(ev)


def _verifier_alertes(
    db: Session,
    lot: LotTraceabilite,
    etape_trace: EtapeTraceabilite,
):
    """
    Vérifie les seuils qualité après la validation d'une étape.
    Crée des AlerteQualite si nécessaire.
    """
    alertes_creees = 0

    # 1. Rendement étape
    if etape_trace.rendement_etape is not None:
        rend = etape_trace.rendement_etape
        if rend < SEUIL_RENDEMENT_CRITIQUE:
            niveau = NiveauAlerte.CRITIQUE
            msg = (
                f"Rendement critique sur {etape_trace.machine} "
                f"({etape_trace.nom_machine}) : {rend:.1f}% "
                f"< seuil critique {SEUIL_RENDEMENT_CRITIQUE}%"
            )
        elif rend < SEUIL_RENDEMENT_ALERTE:
            niveau = NiveauAlerte.AVERTISSEMENT
            msg = (
                f"Rendement faible sur {etape_trace.machine} "
                f"({etape_trace.nom_machine}) : {rend:.1f}% "
                f"< seuil {SEUIL_RENDEMENT_ALERTE}%"
            )
        else:
            niveau = None

        if niveau:
            alerte = AlerteQualite(
                lot_id         = lot.id,
                etape_trace_id = etape_trace.id,
                niveau         = niveau,
                message        = msg,
                machine        = etape_trace.machine,
                valeur_mesuree = rend,
                seuil          = (
                    SEUIL_RENDEMENT_CRITIQUE
                    if niveau == NiveauAlerte.CRITIQUE
                    else SEUIL_RENDEMENT_ALERTE
                ),
                horodatage     = datetime.utcnow(),
            )
            db.add(alerte)
            alertes_creees += 1
            _ajouter_evenement(
                db, lot, TypeEvenement.ALERTE_QUALITE,
                f"Alerte {niveau.value} – {msg}",
                machine=etape_trace.machine,
            )

    # 2. Rebuts dépassant le seuil
    if etape_trace.qte_entree and etape_trace.qte_entree > 0:
        pct_rebut = (etape_trace.qte_rebut / etape_trace.qte_entree) * 100
        if pct_rebut > SEUIL_REBUT_PCT:
            msg = (
                f"Taux de rebuts élevé sur {etape_trace.machine} : "
                f"{pct_rebut:.1f}% ({etape_trace.qte_rebut} kg) "
                f"> seuil {SEUIL_REBUT_PCT}%"
            )
            alerte = AlerteQualite(
                lot_id         = lot.id,
                etape_trace_id = etape_trace.id,
                niveau         = NiveauAlerte.AVERTISSEMENT,
                message        = msg,
                machine        = etape_trace.machine,
                valeur_mesuree = pct_rebut,
                seuil          = SEUIL_REBUT_PCT,
                horodatage     = datetime.utcnow(),
            )
            db.add(alerte)
            alertes_creees += 1

    lot.nb_alertes += alertes_creees
    db.flush()


# ── HOOK 1 : Création du lot (appelé depuis production/service.create_production) ──

def creer_lot(db: Session, production: Production) -> LotTraceabilite:
    """
    Crée le LotTraceabilite associé à une Production qui vient d'être lancée.
    À appeler juste après le commit de create_production.
    """
    lot = LotTraceabilite(
        numero_lot        = _generer_numero_lot(production.of_numero, production.id),
        production_id     = production.id,
        of_id             = production.of_id,
        of_numero         = production.of_numero,
        produit_fini      = production.produit_fini,
        code_produit_fini = MAPPING_PRODUIT_FINI.get(production.produit_fini),
        code_mp           = MAPPING_MP.get(production.produit_fini),
        qte_pf_prevue     = production.quantite_produit_fini,
        statut            = StatutLot.EN_COURS,
        date_debut        = datetime.utcnow(),
    )
    db.add(lot)
    db.flush()

    _ajouter_evenement(
        db, lot, TypeEvenement.DEBUT_PRODUCTION,
        f"Lancement production OF {production.of_numero} – "
        f"Objectif PF : {production.quantite_produit_fini} kg",
        metadata={"production_id": production.id, "of_id": production.of_id},
    )

    db.commit()
    db.refresh(lot)
    return lot


# ── HOOK 2 : Snapshot étape (appelé depuis production/service.avancer_pipeline) ──

def enregistrer_etape(
    db: Session,
    production_id: int,
    etape: EtapeProduction,
    rebuts_etape: Optional[list] = None,
) -> EtapeTraceabilite:
    """
    Crée un snapshot EtapeTraceabilite pour l'étape qui vient d'être validée.
    Appeler après le flush() de avancer_pipeline, avant le commit.
    """
    lot = _get_lot_by_production(db, production_id)
    if not lot:
        return None

    qte_rebut = sum(r.quantite for r in (rebuts_etape or []))
    rendement = _calc_rendement(etape.qte_entree, etape.qte_sortie)
    duree = _calc_duree(etape.debut, etape.fin)

    etape_trace = EtapeTraceabilite(
        lot_id          = lot.id,
        etape_id        = etape.id,
        ordre           = etape.ordre,
        machine         = etape.machine,
        nom_machine     = etape.nom_machine,
        operateur       = etape.operateur,
        qte_entree      = etape.qte_entree,
        qte_sortie      = etape.qte_sortie,
        qte_rebut       = qte_rebut,
        rendement_etape = rendement,
        debut           = etape.debut,
        fin             = etape.fin,
        duree_minutes   = duree,
        conforme        = (rendement is None or rendement >= SEUIL_RENDEMENT_ALERTE),
        horodatage      = datetime.utcnow(),
    )
    db.add(etape_trace)
    db.flush()

    # Rebuts liés
    for r in (rebuts_etape or []):
        rt = RebutTraceabilite(
            etape_trace_id = etape_trace.id,
            rebut_id       = r.id,
            machine        = r.machine,
            defaut         = r.defaut,
            quantite       = r.quantite,
        )
        db.add(rt)

    lot.total_rebuts += qte_rebut
    db.flush()

    _ajouter_evenement(
        db, lot, TypeEvenement.FIN_ETAPE,
        f"Étape {etape.ordre}/{len(SEQUENCE_MACHINES)} validée – "
        f"{etape.machine} ({etape.nom_machine}) – "
        f"Entrée: {etape.qte_entree} kg → Sortie: {etape.qte_sortie} kg "
        f"– Rendement: {rendement:.1f}%" if rendement else
        f"Étape {etape.ordre} validée – {etape.machine}",
        machine=etape.machine,
        operateur=etape.operateur,
        valeur_apres=rendement,
    )

    _verifier_alertes(db, lot, etape_trace)
    db.flush()
    return etape_trace


# ── HOOK 3 : Lier un rebut au lot (appelé depuis production/service.create_rebut) ──

def lier_rebut_lot(db: Session, rebut: "Rebut"):
    """
    Après création d'un Rebut dans le module production,
    met à jour l'EtapeTraceabilite correspondante si elle existe.
    """
    lot = _get_lot_by_production(db, rebut.production_id)
    if not lot:
        return

    # Retrouver l'étape de trace correspondant à la machine du rebut
    etape_trace = (
        db.query(EtapeTraceabilite)
        .filter(
            EtapeTraceabilite.lot_id == lot.id,
            EtapeTraceabilite.machine == rebut.machine,
        )
        .first()
    )

    rt = RebutTraceabilite(
        etape_trace_id = etape_trace.id if etape_trace else None,
        rebut_id       = rebut.id,
        machine        = rebut.machine,
        defaut         = rebut.defaut,
        quantite       = rebut.quantite,
    )
    # Si pas d'etape_trace : rebut orphelin, on crée quand même l'enregistrement
    if not etape_trace:
        rt.etape_trace_id = None

    lot.total_rebuts += rebut.quantite
    db.add(rt)

    _ajouter_evenement(
        db, lot, TypeEvenement.REBUT_ENREGISTRE,
        f"Rebut enregistré – {rebut.machine} – {rebut.defaut} : {rebut.quantite} kg",
        machine=rebut.machine,
    )
    db.flush()


# ── HOOK 4 : Clôture du lot (appelé depuis production/service après pipeline terminé) ──

def cloturer_lot(db: Session, production: Production):
    """
    Calcule les KPIs finaux et ferme le lot.
    Détermine le statut CONFORME / NON_CONFORME selon les alertes critiques.
    """
    lot = _get_lot_by_production(db, production.id)
    if not lot:
        return

    lot.qte_mp_reelle  = production.quantite_matiere_premiere
    lot.qte_pf_reelle  = production.quantite_produit_fini
    lot.rendement_global = _calc_rendement(
        production.quantite_matiere_premiere,
        production.quantite_produit_fini,
    )
    lot.date_fin = datetime.utcnow()

    # Conformité globale : pas d'alerte CRITIQUE non acquittée
    alertes_critiques = (
        db.query(AlerteQualite)
        .filter(
            AlerteQualite.lot_id == lot.id,
            AlerteQualite.niveau == NiveauAlerte.CRITIQUE,
            AlerteQualite.acquittee == False,  # noqa: E712
        )
        .count()
    )
    lot.statut = StatutLot.NON_CONFORME if alertes_critiques > 0 else StatutLot.CONFORME

    _ajouter_evenement(
        db, lot, TypeEvenement.FIN_PRODUCTION,
        f"Production terminée – PF réel : {production.quantite_produit_fini} kg – "
        f"MP consommée : {production.quantite_matiere_premiere} kg – "
        f"Rendement global : {lot.rendement_global:.1f}%"
        if lot.rendement_global else "Production terminée",
        metadata={
            "statut_lot"      : lot.statut,
            "nb_alertes"      : lot.nb_alertes,
            "total_rebuts_kg" : lot.total_rebuts,
        },
    )
    db.commit()
    db.refresh(lot)
    return lot


# ── LECTURE ───────────────────────────────────────────────────────────────────

def _get_lot_by_production(db: Session, production_id: int) -> Optional[LotTraceabilite]:
    return (
        db.query(LotTraceabilite)
        .filter(LotTraceabilite.production_id == production_id)
        .first()
    )


def get_lot(db: Session, lot_id: int) -> LotTraceabilite:
    lot = db.query(LotTraceabilite).filter(LotTraceabilite.id == lot_id).first()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    return lot


def get_lot_by_numero(db: Session, numero_lot: str) -> LotTraceabilite:
    lot = db.query(LotTraceabilite).filter(LotTraceabilite.numero_lot == numero_lot).first()
    if not lot:
        raise HTTPException(status_code=404, detail=f"Lot {numero_lot} introuvable")
    return lot


def get_lot_by_production_id(db: Session, production_id: int) -> LotTraceabilite:
    lot = _get_lot_by_production(db, production_id)
    if not lot:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun lot de traçabilité pour la production {production_id}",
        )
    return lot


def get_lots(
    db: Session,
    statut: Optional[str] = None,
    produit: Optional[str] = None,
) -> list[LotTraceabilite]:
    q = db.query(LotTraceabilite)
    if statut:
        q = q.filter(LotTraceabilite.statut == statut)
    if produit:
        q = q.filter(LotTraceabilite.produit_fini.ilike(f"%{produit}%"))
    return q.order_by(LotTraceabilite.date_debut.desc()).all()


def get_evenements_lot(db: Session, lot_id: int) -> list[EvenementTraceabilite]:
    return (
        db.query(EvenementTraceabilite)
        .filter(EvenementTraceabilite.lot_id == lot_id)
        .order_by(EvenementTraceabilite.horodatage)
        .all()
    )


def get_alertes_lot(db: Session, lot_id: int) -> list[AlerteQualite]:
    return (
        db.query(AlerteQualite)
        .filter(AlerteQualite.lot_id == lot_id)
        .order_by(AlerteQualite.horodatage)
        .all()
    )


def acquitter_alerte(db: Session, alerte_id: int) -> AlerteQualite:
    alerte = db.query(AlerteQualite).filter(AlerteQualite.id == alerte_id).first()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    alerte.acquittee = True
    db.commit()
    db.refresh(alerte)
    return alerte


# ── RAPPORT ───────────────────────────────────────────────────────────────────

def generer_rapport(db: Session, lot_id: int) -> schema.RapportTraceabilite:
    """Génère un rapport synthétique complet pour un lot clos."""
    lot = get_lot(db, lot_id)

    # Rendement par étape
    rendement_par_etape = [
        {
            "ordre"     : e.ordre,
            "machine"   : e.machine,
            "nom"       : e.nom_machine,
            "rendement" : e.rendement_etape,
            "perte_kg"  : round((e.qte_entree or 0) - (e.qte_sortie or 0), 3),
            "conforme"  : e.conforme,
        }
        for e in lot.etapes_trace
    ]

    # Rebuts agrégés par type de défaut
    rebuts_agg: dict[str, dict] = defaultdict(lambda: {"total_kg": 0.0, "nb": 0})
    for etape in lot.etapes_trace:
        for r in etape.rebuts_trace:
            rebuts_agg[r.defaut]["total_kg"] += r.quantite
            rebuts_agg[r.defaut]["nb"] += 1
    rebuts_par_defaut = [
        {"defaut": k, "total_kg": round(v["total_kg"], 3), "nb_occurrences": v["nb"]}
        for k, v in rebuts_agg.items()
    ]

    # Durée totale
    duree_totale = sum(
        (e.duree_minutes or 0) for e in lot.etapes_trace
    ) or None

    # Conformité globale
    conformite = not any(
        a.niveau == NiveauAlerte.CRITIQUE and not a.acquittee
        for a in lot.alertes
    )

    # Résumé textuel
    resume_parts = [
        f"Lot {lot.numero_lot} – OF {lot.of_numero} – {lot.produit_fini}.",
        f"MP consommée : {lot.qte_mp_reelle} kg."
        if lot.qte_mp_reelle else "",
        f"PF produit : {lot.qte_pf_reelle} kg."
        if lot.qte_pf_reelle else "",
        f"Rendement global : {lot.rendement_global:.1f}%."
        if lot.rendement_global else "",
        f"Rebuts totaux : {lot.total_rebuts:.2f} kg.",
        f"{lot.nb_alertes} alerte(s) enregistrée(s).",
        "Lot CONFORME." if conformite else "⚠️ Lot NON CONFORME – alertes critiques non acquittées.",
    ]
    resume = " ".join(p for p in resume_parts if p)

    return schema.RapportTraceabilite(
        lot                = schema.LotTraceabiliteResponse.model_validate(lot),
        duree_totale_min   = duree_totale,
        rendement_par_etape= rendement_par_etape,
        rebuts_par_defaut  = rebuts_par_defaut,
        conformite         = conformite,
        resume             = resume,
    )