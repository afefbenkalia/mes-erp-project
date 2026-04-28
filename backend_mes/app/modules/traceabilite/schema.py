"""
schema.py – Traçabilité MES · Schémas Pydantic
"""

from pydantic import BaseModel, Field, computed_field
from typing import Optional, List, Any, Dict
from datetime import date, datetime
from enum import Enum


# ─────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────

class StatutLot(str, Enum):
    EN_COURS      = "EN_COURS"
    CONFORME      = "CONFORME"
    NON_CONFORME  = "NON_CONFORME"
    BLOQUE        = "BLOQUE"


class TypeEvenement(str, Enum):
    DEBUT_PRODUCTION  = "DEBUT_PRODUCTION"
    FIN_PRODUCTION    = "FIN_PRODUCTION"
    DEBUT_ETAPE       = "DEBUT_ETAPE"
    FIN_ETAPE         = "FIN_ETAPE"
    REBUT_ENREGISTRE  = "REBUT_ENREGISTRE"
    ALERTE_QUALITE    = "ALERTE_QUALITE"
    BLOCAGE           = "BLOCAGE"
    DEBLOCAGE         = "DEBLOCAGE"
    NOTIFICATION_ERP  = "NOTIFICATION_ERP"
    CORRECTION        = "CORRECTION"


class NiveauAlerte(str, Enum):
    INFO          = "INFO"
    AVERTISSEMENT = "AVERTISSEMENT"
    CRITIQUE      = "CRITIQUE"


# ─────────────────────────────────────────────
#  REBUT TRAÇABILITÉ
# ─────────────────────────────────────────────

class RebutTraceabiliteResponse(BaseModel):
    id             : int
    etape_trace_id : int
    rebut_id       : Optional[int]
    machine        : str
    defaut         : str
    quantite       : float
    date           : date
    horodatage     : datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  ÉTAPE TRAÇABILITÉ
# ─────────────────────────────────────────────

class EtapeTraceabiliteResponse(BaseModel):
    id              : int
    lot_id          : int
    etape_id        : Optional[int]
    ordre           : int
    machine         : str
    nom_machine     : Optional[str]
    operateur       : Optional[str]
    qte_entree      : Optional[float]
    qte_sortie      : Optional[float]
    qte_rebut       : float
    rendement_etape : Optional[float]
    debut           : Optional[str]
    fin             : Optional[str]
    duree_minutes   : Optional[int]
    conforme        : bool
    observations    : Optional[str]
    horodatage      : datetime
    rebuts_trace    : List[RebutTraceabiliteResponse] = []

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  ÉVÉNEMENT
# ─────────────────────────────────────────────

class EvenementResponse(BaseModel):
    id             : int
    lot_id         : int
    type_evenement : TypeEvenement
    description    : str
    machine        : Optional[str]
    operateur      : Optional[str]
    valeur_avant   : Optional[float]
    valeur_apres   : Optional[float]
    horodatage     : datetime
    metadata_json  : Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  ALERTE QUALITÉ
# ─────────────────────────────────────────────

class AlerteQualiteResponse(BaseModel):
    id             : int
    lot_id         : int
    etape_trace_id : Optional[int]
    niveau         : NiveauAlerte
    message        : str
    machine        : Optional[str]
    valeur_mesuree : Optional[float]
    seuil          : Optional[float]
    acquittee      : bool
    horodatage     : datetime

    class Config:
        from_attributes = True


class AlerteAcquittement(BaseModel):
    """Corps de la requête pour acquitter une alerte."""
    acquittee: bool = True


# ─────────────────────────────────────────────
#  LOT TRAÇABILITÉ
# ─────────────────────────────────────────────

class LotTraceabiliteResponse(BaseModel):
    id                : int
    numero_lot        : str
    production_id     : int
    of_id             : int
    of_numero         : str
    produit_fini      : str
    code_produit_fini : Optional[str]
    code_mp           : Optional[str]
    qte_mp_prevue     : Optional[float]
    qte_mp_reelle     : Optional[float]
    qte_pf_prevue     : Optional[float]
    qte_pf_reelle     : Optional[float]
    rendement_global  : Optional[float]
    total_rebuts      : float
    nb_alertes        : int
    statut            : StatutLot
    date_debut        : datetime
    date_fin          : Optional[datetime]
    date_creation     : date
    metadata_extra    : Optional[Dict[str, Any]]
    etapes_trace      : List[EtapeTraceabiliteResponse] = []
    evenements        : List[EvenementResponse]         = []
    alertes           : List[AlerteQualiteResponse]     = []

    class Config:
        from_attributes = True


class LotSummaryResponse(BaseModel):
    """Version allégée pour les listes (sans étapes/événements détaillés)."""
    id                : int
    numero_lot        : str
    production_id     : int
    of_numero         : str
    produit_fini      : str
    qte_mp_reelle     : Optional[float]
    qte_pf_reelle     : Optional[float]
    rendement_global  : Optional[float]
    total_rebuts      : float
    nb_alertes        : int
    statut            : StatutLot
    date_debut        : datetime
    date_fin          : Optional[datetime]
    date_creation     : date

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  RAPPORT (export / synthèse)
# ─────────────────────────────────────────────

class RapportTraceabilite(BaseModel):
    """Rapport synthétique généré à la clôture du lot."""
    lot               : LotTraceabiliteResponse
    duree_totale_min  : Optional[int]           # somme duree_minutes des étapes
    rendement_par_etape: List[Dict[str, Any]]   # [{machine, rendement, perte_kg}]
    rebuts_par_defaut : List[Dict[str, Any]]    # [{defaut, total_kg, nb_occurrences}]
    conformite        : bool                    # True si aucune alerte CRITIQUE
    resume            : str                     # texte synthétique généré