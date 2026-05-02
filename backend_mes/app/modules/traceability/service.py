"""
service.py – Traçabilité MES
Logique métier : agrège les données des tables existantes pour
construire les vues de traçabilité.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List

from app.modules.production.model import (
    Production,
    EtapeProduction,
    HistoriqueProduction,
    Rebut,
    StatutProduction,
    SEQUENCE_MACHINES,
)

NB_ETAPES = len(SEQUENCE_MACHINES)


# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────

def _calc_rendement(qte_entree: Optional[float], qte_sortie: Optional[float]) -> Optional[float]:
    """Calcule le rendement en % arrondi à 1 décimale."""
    if qte_entree and qte_sortie and qte_entree > 0:
        return round((qte_sortie / qte_entree) * 100, 1)
    return None


def _calc_perte(qte_entree: Optional[float], qte_sortie: Optional[float]) -> Optional[float]:
    if qte_entree is not None and qte_sortie is not None:
        return round(qte_entree - qte_sortie, 3)
    return None


# ─────────────────────────────────────────────
#  SUIVI PAR LOT
# ─────────────────────────────────────────────

def get_lot_trace(db: Session, production_id: int):
    """
    Retourne la fiche de traçabilité complète pour une production.
    Inclut toutes les étapes avec paramètres calculés + rebuts.
    """
    prod = db.query(Production).filter(Production.id == production_id).first()
    if not prod:
        return None

    # Étapes triées par ordre
    etapes = (
        db.query(EtapeProduction)
        .filter(EtapeProduction.production_id == production_id)
        .order_by(EtapeProduction.ordre)
        .all()
    )

    # Rebuts liés à cette production
    rebuts = (
        db.query(Rebut)
        .filter(Rebut.production_id == production_id)
        .all()
    )

    # Construction des étapes enrichies
    etapes_trace = []
    for e in etapes:
        etapes_trace.append({
            "ordre"      : e.ordre,
            "machine"    : e.machine,
            "nom_machine": e.nom_machine,
            "qte_entree" : e.qte_entree,
            "qte_sortie" : e.qte_sortie,
            "operateur"  : e.operateur,
            "debut"      : e.debut,
            "fin"        : e.fin,
            "statut"     : e.statut,
            "date"       : e.date,
            "perte"      : _calc_perte(e.qte_entree, e.qte_sortie),
            "rendement"  : _calc_rendement(e.qte_entree, e.qte_sortie),
        })

    # KPIs globaux
    nb_terminees   = sum(1 for e in etapes if str(e.statut) in ("TERMINE", "StatutEtape.TERMINE"))
    total_rebuts   = sum(r.quantite for r in rebuts)
    qte_mp         = prod.quantite_matiere_premiere
    qte_pf         = prod.quantite_produit_fini
    rendement_global = _calc_rendement(qte_mp, qte_pf)

    # Pertes totales = différence entre entrée étape 1 et sortie étape 11
    etapes_terminees = [e for e in etapes if e.qte_entree is not None and e.qte_sortie is not None]
    total_pertes = None
    if etapes_terminees:
        total_pertes = round(
            sum(_calc_perte(e.qte_entree, e.qte_sortie) or 0 for e in etapes_terminees), 3
        )

    return {
        "production_id"            : prod.id,
        "of_numero"                : prod.of_numero,
        "produit_fini"             : prod.produit_fini,
        "quantite_produit_fini"    : prod.quantite_produit_fini,
        "quantite_matiere_premiere": prod.quantite_matiere_premiere,
        "statut"                   : prod.statut,
        "date_production"          : prod.date,
        "rendement_global"         : rendement_global,
        "total_pertes"             : total_pertes,
        "total_rebuts"             : total_rebuts,
        "nb_etapes_terminees"      : nb_terminees,
        "nb_etapes_total"          : NB_ETAPES,
        "etapes"                   : etapes_trace,
        "rebuts"                   : [
            {
                "id"      : r.id,
                "machine" : r.machine,
                "defaut"  : r.defaut,
                "quantite": r.quantite,
                "date"    : r.date,
            }
            for r in rebuts
        ],
    }


def get_all_lots(db: Session, statut: Optional[str] = None, produit: Optional[str] = None):
    """
    Liste toutes les productions avec leurs KPIs de traçabilité.
    Filtres optionnels : statut, produit_fini.
    """
    q = db.query(Production)
    if statut:
        q = q.filter(Production.statut == statut)
    if produit:
        q = q.filter(Production.produit_fini.ilike(f"%{produit}%"))

    productions = q.order_by(Production.date.desc()).all()
    result = []

    for prod in productions:
        rebuts_total = (
            db.query(func.sum(Rebut.quantite))
            .filter(Rebut.production_id == prod.id)
            .scalar() or 0
        )
        nb_terminees = (
            db.query(func.count(EtapeProduction.id))
            .filter(
                EtapeProduction.production_id == prod.id,
                EtapeProduction.statut == "TERMINE",
            )
            .scalar() or 0
        )
        result.append({
            "production_id"            : prod.id,
            "of_numero"                : prod.of_numero,
            "produit_fini"             : prod.produit_fini,
            "quantite_produit_fini"    : prod.quantite_produit_fini,
            "quantite_matiere_premiere": prod.quantite_matiere_premiere,
            "statut"                   : prod.statut,
            "date_production"          : prod.date,
            "rendement_global"         : _calc_rendement(
                prod.quantite_matiere_premiere, prod.quantite_produit_fini
            ),
            "total_rebuts"             : float(rebuts_total),
            "nb_etapes_terminees"      : nb_terminees,
            "nb_etapes_total"          : NB_ETAPES,
            "etapes"                   : [],  # allégé pour la liste
            "rebuts"                   : [],
        })

    return result


# ─────────────────────────────────────────────
#  HISTORISATION
# ─────────────────────────────────────────────

def get_historique(
    db: Session,
    production_id: Optional[int] = None,
    machine: Optional[str] = None,
    evenement: Optional[str] = None,
    limit: int = 200,
):
    """
    Retourne l'historique de production avec filtres optionnels.
    Utilisé pour l'onglet Historisation de production.
    """
    q = db.query(HistoriqueProduction)
    if production_id:
        q = q.filter(HistoriqueProduction.production_id == production_id)
    if machine:
        q = q.filter(HistoriqueProduction.machine == machine)
    if evenement:
        q = q.filter(HistoriqueProduction.evenement == evenement)
    return q.order_by(HistoriqueProduction.date.desc()).limit(limit).all()


# ─────────────────────────────────────────────
#  ASSOCIATION MACHINE / PRODUCTION
# ─────────────────────────────────────────────

def get_association_machines(db: Session):
    """
    Pour chaque machine de la séquence, agrège :
      - Nombre de productions passées
      - Quantités totales entrée/sortie
      - Rendement moyen
      - Rebuts totaux
      - Dernière utilisation
    """
    result = []

    for machine_info in SEQUENCE_MACHINES:
        code = machine_info["code"]
        nom  = machine_info["nom"]

        # Étapes liées à cette machine
        etapes = (
            db.query(EtapeProduction)
            .filter(EtapeProduction.machine == code)
            .all()
        )

        nb_productions   = len(etapes)
        qte_entree_total = sum(e.qte_entree or 0 for e in etapes if e.qte_entree)
        qte_sortie_total = sum(e.qte_sortie or 0 for e in etapes if e.qte_sortie)
        rendement_moyen  = _calc_rendement(qte_entree_total, qte_sortie_total)

        # Rebuts sur cette machine
        total_rebuts = (
            db.query(func.sum(Rebut.quantite))
            .filter(Rebut.machine == code)
            .scalar() or 0
        )

        # Dernière date d'utilisation
        derniere_etape = (
            db.query(EtapeProduction)
            .filter(EtapeProduction.machine == code)
            .order_by(EtapeProduction.date.desc())
            .first()
        )

        result.append({
            "machine_code"    : code,
            "nom_machine"     : nom,
            "nb_productions"  : nb_productions,
            "qte_entree_total": round(qte_entree_total, 2) if qte_entree_total else None,
            "qte_sortie_total": round(qte_sortie_total, 2) if qte_sortie_total else None,
            "rendement_moyen" : rendement_moyen,
            "total_rebuts"    : float(total_rebuts),
            "derniere_date"   : derniere_etape.date if derniere_etape else None,
        })

    return result


# ─────────────────────────────────────────────
#  RÉSUMÉ GLOBAL
# ─────────────────────────────────────────────

def get_summary(db: Session):
    """KPIs globaux pour le tableau de bord de traçabilité."""
    total_prod      = db.query(func.count(Production.id)).scalar() or 0
    prod_terminees  = db.query(func.count(Production.id)).filter(
        Production.statut == StatutProduction.TERMINE
    ).scalar() or 0
    prod_en_cours   = db.query(func.count(Production.id)).filter(
        Production.statut == StatutProduction.EN_COURS
    ).scalar() or 0

    total_pf = db.query(func.sum(Production.quantite_produit_fini)).filter(
        Production.statut == StatutProduction.TERMINE
    ).scalar() or 0

    total_mp = db.query(func.sum(Production.quantite_matiere_premiere)).filter(
        Production.statut == StatutProduction.TERMINE
    ).scalar() or 0

    total_rebuts = db.query(func.sum(Rebut.quantite)).scalar() or 0

    machines_actives = len(SEQUENCE_MACHINES)

    return {
        "total_productions"     : total_prod,
        "productions_terminees" : prod_terminees,
        "productions_en_cours"  : prod_en_cours,
        "total_pf_produit"      : float(total_pf),
        "total_mp_consomme"     : float(total_mp),
        "rendement_global"      : _calc_rendement(float(total_mp), float(total_pf)),
        "total_rebuts"          : float(total_rebuts),
        "machines_actives"      : machines_actives,
    }