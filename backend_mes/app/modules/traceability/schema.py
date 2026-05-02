"""
schema.py – Traçabilité MES
Schémas Pydantic pour le module de traçabilité.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import date


# ─────────────────────────────────────────────
#  SUIVI PAR LOT (vue agrégée d'une production)
# ─────────────────────────────────────────────

class EtapeTraceResponse(BaseModel):
    """Détail d'une étape dans la fiche de traçabilité d'un lot."""
    ordre       : int
    machine     : str
    nom_machine : Optional[str]
    qte_entree  : Optional[float]
    qte_sortie  : Optional[float]
    operateur   : Optional[str]
    debut       : Optional[str]
    fin         : Optional[str]
    statut      : str
    date        : date
    # Paramètres calculés
    perte       : Optional[float] = None   # qte_entree - qte_sortie
    rendement   : Optional[float] = None   # (qte_sortie / qte_entree) * 100

    class Config:
        from_attributes = True


class RebutTraceResponse(BaseModel):
    """Rebut enregistré dans la fiche de traçabilité."""
    id       : int
    machine  : str
    defaut   : str
    quantite : float
    date     : date

    class Config:
        from_attributes = True


class LotTraceResponse(BaseModel):
    """Fiche de traçabilité complète pour une production (lot)."""
    # Identifiants
    production_id             : int
    of_numero                 : str
    produit_fini              : str
    # Quantités
    quantite_produit_fini     : Optional[float]
    quantite_matiere_premiere : Optional[float]
    # Statut & date
    statut                    : str
    date_production           : date
    # KPIs calculés
    rendement_global          : Optional[float] = None   # %
    total_pertes              : Optional[float] = None   # kg
    total_rebuts              : Optional[float] = None   # kg
    nb_etapes_terminees       : int = 0
    nb_etapes_total           : int = 0
    # Détail
    etapes                    : List[EtapeTraceResponse] = []
    rebuts                    : List[RebutTraceResponse] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  HISTORISATION DE PRODUCTION
# ─────────────────────────────────────────────

class HistoriqueItemResponse(BaseModel):
    """Un événement dans l'historique de production."""
    id                        : int
    evenement                 : str
    machine                   : Optional[str]
    of_id                     : Optional[int]
    production_id             : Optional[int]
    etape_id                  : Optional[int]
    quantite_produit_fini     : Optional[float]
    quantite_matiere_premiere : Optional[float]
    date                      : date

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  ASSOCIATION MACHINE / PRODUCTION
# ─────────────────────────────────────────────

class AssociationMachineResponse(BaseModel):
    """Association entre une machine et ses productions."""
    machine_code    : str
    nom_machine     : str
    # Productions passées par cette machine
    nb_productions  : int
    # Quantités cumulées traitées
    qte_entree_total : Optional[float]
    qte_sortie_total : Optional[float]
    # Rendement moyen sur la machine
    rendement_moyen  : Optional[float]
    # Rebuts liés à cette machine
    total_rebuts     : Optional[float]
    # Dernière utilisation
    derniere_date    : Optional[date]
    # Paramètres MQTT temps réel (injectés depuis le frontend si disponibles)
    temperature      : Optional[float] = None
    pression         : Optional[float] = None
    vitesse          : Optional[int]   = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  RÉSUMÉ GLOBAL DE TRAÇABILITÉ
# ─────────────────────────────────────────────

class TraceabilitySummaryResponse(BaseModel):
    """Vue d'ensemble : KPIs globaux de traçabilité."""
    total_productions        : int
    productions_terminees    : int
    productions_en_cours     : int
    total_pf_produit         : float   # kg produit fini total
    total_mp_consomme        : float   # kg matière première totale
    rendement_global         : Optional[float]  # %
    total_rebuts             : float   # kg
    machines_actives         : int