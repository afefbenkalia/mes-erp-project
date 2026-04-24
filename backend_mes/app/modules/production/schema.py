from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from enum import Enum


# ─────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────

class StatutProduction(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    EN_COURS   = "EN_COURS"
    TERMINE    = "TERMINE"


class StatutEtape(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    EN_COURS   = "EN_COURS"
    TERMINE    = "TERMINE"


# ─────────────────────────────────────────────
#  ÉTAPE
# ─────────────────────────────────────────────

class EtapeCreate(BaseModel):
    """Données saisies par l'opérateur pour valider l'étape courante."""
    qte_entree : float
    qte_sortie : float
    operateur  : Optional[str] = None
    debut      : Optional[str] = None
    fin        : Optional[str] = None


class EtapeResponse(BaseModel):
    id            : int
    production_id : int
    ordre         : int
    machine       : str
    nom_machine   : Optional[str]
    qte_entree    : Optional[float]
    qte_sortie    : Optional[float]
    operateur     : Optional[str]
    debut         : Optional[str]
    fin           : Optional[str]
    statut        : StatutEtape
    date          : date

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  PIPELINE STATE
# ─────────────────────────────────────────────

class PipelineStateResponse(BaseModel):
    production_id    : int
    etape_validee    : EtapeResponse
    etape_suivante   : Optional[EtapeResponse]
    pipeline_termine : bool
    progression      : int
    statut_production: StatutProduction


# ─────────────────────────────────────────────
#  PRODUCTION
# ─────────────────────────────────────────────

class ProductionCreate(BaseModel):
    of_id                 : int
    produit_fini          : str
    quantite_produit_fini : float   # FIX: nom unifié partout


class ProductionResponse(BaseModel):
    id                        : int
    of_id                     : int
    of_numero                 : str
    produit_fini              : str
    quantite_produit_fini     : Optional[float]
    quantite_matiere_premiere : Optional[float]
    statut                    : StatutProduction
    date                      : date
    etapes                    : List[EtapeResponse] = []

    class Config:
        from_attributes = True


class ProductionSummaryResponse(BaseModel):
    """Version allégée sans les étapes (pour les listes)."""
    id                        : int
    of_id                     : int
    of_numero                 : str
    produit_fini              : str
    quantite_produit_fini     : Optional[float]
    quantite_matiere_premiere : Optional[float]
    statut                    : StatutProduction
    date                      : date

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
#  REBUT
# ─────────────────────────────────────────────

class RebutCreate(BaseModel):
    production_id : int
    etape_id      : Optional[int] = None
    machine       : str
    defaut        : str
    quantite      : float


class RebutResponse(RebutCreate):
    id   : int
    date : date

    class Config:
        from_attributes = True