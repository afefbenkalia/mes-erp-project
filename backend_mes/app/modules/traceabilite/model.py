"""
model.py – Module Traçabilité MES

Capture l'ensemble du cycle de vie d'une production :
  - Identification lot / produit fini
  - Matière première consommée
  - Chaque étape machine (opérateur, temps, quantités, rendement)
  - Rebuts par étape
  - Alertes qualité
  - Événements horodatés (audit trail)
"""

from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime,
    ForeignKey, Enum, Boolean, Text, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum

from app.database import Base


# ─────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────

class StatutLot(str, enum.Enum):
    EN_COURS   = "EN_COURS"
    CONFORME   = "CONFORME"
    NON_CONFORME = "NON_CONFORME"
    BLOQUE     = "BLOQUE"


class TypeEvenement(str, enum.Enum):
    DEBUT_PRODUCTION      = "DEBUT_PRODUCTION"
    FIN_PRODUCTION        = "FIN_PRODUCTION"
    DEBUT_ETAPE           = "DEBUT_ETAPE"
    FIN_ETAPE             = "FIN_ETAPE"
    REBUT_ENREGISTRE      = "REBUT_ENREGISTRE"
    ALERTE_QUALITE        = "ALERTE_QUALITE"
    BLOCAGE               = "BLOCAGE"
    DEBLOCAGE             = "DEBLOCAGE"
    NOTIFICATION_ERP      = "NOTIFICATION_ERP"
    CORRECTION            = "CORRECTION"


class NiveauAlerte(str, enum.Enum):
    INFO     = "INFO"
    AVERTISSEMENT = "AVERTISSEMENT"
    CRITIQUE = "CRITIQUE"


# ─────────────────────────────────────────────
#  LOT DE TRAÇABILITÉ
# ─────────────────────────────────────────────

class LotTraceabilite(Base):
    """
    Un Lot est créé automatiquement à chaque lancement de Production.
    Il regroupe toutes les informations nécessaires à la traçabilité complète
    d'un cycle de fabrication, de la matière première au produit fini.
    """
    __tablename__ = "lots_traceabilite"

    id              = Column(Integer, primary_key=True, index=True)
    numero_lot      = Column(String,  unique=True, nullable=False, index=True)
    production_id   = Column(Integer, ForeignKey("productions.id"), nullable=False)
    of_id           = Column(Integer, ForeignKey("ordres_fabrication.id"), nullable=False)
    of_numero       = Column(String,  nullable=False)

    # Identification produit
    produit_fini    = Column(String,  nullable=False)
    code_produit_fini = Column(String, nullable=True)   # ex: PF-RUBAN-COTON

    # Matière première
    code_mp         = Column(String,  nullable=True)    # ex: MP-COTON-BRUT
    qte_mp_prevue   = Column(Float,   nullable=True)    # objectif MP
    qte_mp_reelle   = Column(Float,   nullable=True)    # rempli en fin de prod.

    # Produit fini
    qte_pf_prevue   = Column(Float,   nullable=True)    # objectif PF
    qte_pf_reelle   = Column(Float,   nullable=True)    # rempli en fin de prod.

    # Indicateurs qualité
    rendement_global = Column(Float,  nullable=True)    # (qte_pf / qte_mp) * 100
    total_rebuts     = Column(Float,  default=0.0)      # somme des rebuts
    nb_alertes       = Column(Integer, default=0)

    # Statut & dates
    statut          = Column(Enum(StatutLot), default=StatutLot.EN_COURS)
    date_debut      = Column(DateTime, default=datetime.utcnow)
    date_fin        = Column(DateTime, nullable=True)
    date_creation   = Column(Date,     default=date.today)

    # Métadonnées complémentaires (JSON libre)
    # Ex: {"fournisseur_mp": "Coton SA", "numero_commande": "CMD-2025-001"}
    metadata_extra  = Column(JSON, nullable=True)

    # Relations
    etapes_trace    = relationship(
        "EtapeTraceabilite",
        back_populates="lot",
        order_by="EtapeTraceabilite.ordre",
        cascade="all, delete-orphan",
    )
    evenements      = relationship(
        "EvenementTraceabilite",
        back_populates="lot",
        order_by="EvenementTraceabilite.horodatage",
        cascade="all, delete-orphan",
    )
    alertes         = relationship(
        "AlerteQualite",
        back_populates="lot",
        cascade="all, delete-orphan",
    )


# ─────────────────────────────────────────────
#  ÉTAPE DE TRAÇABILITÉ (snapshot par machine)
# ─────────────────────────────────────────────

class EtapeTraceabilite(Base):
    """
    Snapshot immuable de chaque étape du pipeline pour un lot donné.
    Créé au moment où l'opérateur valide l'étape dans le pipeline.
    Complète EtapeProduction sans la modifier.
    """
    __tablename__ = "etapes_traceabilite"

    id              = Column(Integer, primary_key=True, index=True)
    lot_id          = Column(Integer, ForeignKey("lots_traceabilite.id"), nullable=False)
    etape_id        = Column(Integer, ForeignKey("etapes_production.id"), nullable=True)
    ordre           = Column(Integer, nullable=False)
    machine         = Column(String,  nullable=False)
    nom_machine     = Column(String,  nullable=True)
    operateur       = Column(String,  nullable=True)

    # Quantités
    qte_entree      = Column(Float,   nullable=True)
    qte_sortie      = Column(Float,   nullable=True)
    qte_rebut       = Column(Float,   default=0.0)    # somme rebuts sur cette étape
    rendement_etape = Column(Float,   nullable=True)  # (sortie / entree) * 100

    # Temps
    debut           = Column(String,  nullable=True)
    fin             = Column(String,  nullable=True)
    duree_minutes   = Column(Integer, nullable=True)  # calculé si debut+fin fournis

    # Qualité
    conforme        = Column(Boolean, default=True)
    observations    = Column(Text,    nullable=True)
    horodatage      = Column(DateTime, default=datetime.utcnow)

    lot             = relationship("LotTraceabilite", back_populates="etapes_trace")
    rebuts_trace    = relationship("RebutTraceabilite", back_populates="etape_trace",
                                   cascade="all, delete-orphan")


# ─────────────────────────────────────────────
#  REBUT TRAÇABILITÉ (lié à l'étape du lot)
# ─────────────────────────────────────────────

class RebutTraceabilite(Base):
    """
    Rebut rattaché directement à une étape du lot de traçabilité.
    Miroir du modèle Rebut, mais indexé sur le lot pour cohérence.
    """
    __tablename__ = "rebuts_traceabilite"

    id              = Column(Integer, primary_key=True, index=True)
    etape_trace_id  = Column(Integer, ForeignKey("etapes_traceabilite.id"), nullable=False)
    rebut_id        = Column(Integer, ForeignKey("rebuts.id"), nullable=True)  # lien optionnel
    machine         = Column(String,  nullable=False)
    defaut          = Column(String,  nullable=False)
    quantite        = Column(Float,   nullable=False)
    date            = Column(Date,    default=date.today)
    horodatage      = Column(DateTime, default=datetime.utcnow)

    etape_trace     = relationship("EtapeTraceabilite", back_populates="rebuts_trace")


# ─────────────────────────────────────────────
#  ÉVÉNEMENT (audit trail horodaté)
# ─────────────────────────────────────────────

class EvenementTraceabilite(Base):
    """
    Journal immuable d'audit : chaque action sur la production génère
    un événement horodaté. Permet une reconstitution chronologique complète.
    """
    __tablename__ = "evenements_traceabilite"

    id              = Column(Integer, primary_key=True, index=True)
    lot_id          = Column(Integer, ForeignKey("lots_traceabilite.id"), nullable=False)
    type_evenement  = Column(Enum(TypeEvenement), nullable=False)
    description     = Column(Text,    nullable=False)
    machine         = Column(String,  nullable=True)
    operateur       = Column(String,  nullable=True)
    valeur_avant    = Column(Float,   nullable=True)   # pour corrections
    valeur_apres    = Column(Float,   nullable=True)   # pour corrections
    horodatage      = Column(DateTime, default=datetime.utcnow, index=True)
    metadata_json   = Column(JSON,    nullable=True)   # données brutes optionnelles

    lot             = relationship("LotTraceabilite", back_populates="evenements")


# ─────────────────────────────────────────────
#  ALERTE QUALITÉ
# ─────────────────────────────────────────────

class AlerteQualite(Base):
    """
    Déclenchée automatiquement quand un seuil est dépassé :
    - Rendement étape < 90 %
    - Rebuts > 5 % de la quantité entrante
    - Durée étape anormalement longue (si configuré)
    """
    __tablename__ = "alertes_qualite"

    id              = Column(Integer, primary_key=True, index=True)
    lot_id          = Column(Integer, ForeignKey("lots_traceabilite.id"), nullable=False)
    etape_trace_id  = Column(Integer, ForeignKey("etapes_traceabilite.id"), nullable=True)
    niveau          = Column(Enum(NiveauAlerte), nullable=False)
    message         = Column(Text,    nullable=False)
    machine         = Column(String,  nullable=True)
    valeur_mesuree  = Column(Float,   nullable=True)
    seuil           = Column(Float,   nullable=True)
    acquittee       = Column(Boolean, default=False)
    horodatage      = Column(DateTime, default=datetime.utcnow)

    lot             = relationship("LotTraceabilite", back_populates="alertes")