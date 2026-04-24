from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import date
import enum

from app.database import Base


# ─────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────

class StatutProduction(str, enum.Enum):
    EN_ATTENTE = "EN_ATTENTE"
    EN_COURS   = "EN_COURS"
    TERMINE    = "TERMINE"


class StatutEtape(str, enum.Enum):
    EN_ATTENTE = "EN_ATTENTE"
    EN_COURS   = "EN_COURS"
    TERMINE    = "TERMINE"


# ─────────────────────────────────────────────
#  SÉQUENCE FIXE DES MACHINES (atelier cardage)
# ─────────────────────────────────────────────

SEQUENCE_MACHINES = [
    {"ordre": 1,  "code": "CT-ALIM-01", "nom": "Alimentation"},
    {"ordre": 2,  "code": "CT-COND-01", "nom": "Condenseur 1"},
    {"ordre": 3,  "code": "CT-NET-01",  "nom": "Nettoyeuse"},
    {"ordre": 4,  "code": "CT-COND-02", "nom": "Condenseur 2"},
    {"ordre": 5,  "code": "CT-CARD-01", "nom": "Cardage 1"},
    {"ordre": 6,  "code": "CT-CARD-02", "nom": "Cardage 2"},
    {"ordre": 7,  "code": "CT-CARD-03", "nom": "Cardage 3"},
    {"ordre": 8,  "code": "CT-COND-03", "nom": "Condenseur 3"},
    {"ordre": 9,  "code": "CT-INJ-01",  "nom": "Injection"},
    {"ordre": 10, "code": "CT-SEC-01",  "nom": "Séchage"},
    {"ordre": 11, "code": "CT-BOB-01",  "nom": "Bobinage"},
]


# ─────────────────────────────────────────────
#  PRODUCTION
# ─────────────────────────────────────────────

class Production(Base):
    """
    Une Production correspond à l'exécution complète d'un OF.
    - quantite_matiere_premiere : rempli auto depuis qte_entree  de l'étape 1
    - quantite_produit_fini     : objectif saisi au lancement, puis écrasé
                                  par qte_sortie réelle de l'étape 11
    """
    __tablename__ = "productions"

    id                        = Column(Integer, primary_key=True, index=True)
    of_id                     = Column(Integer, ForeignKey("ordres_fabrication.id"), nullable=False)
    of_numero                 = Column(String, nullable=False)
    produit_fini              = Column(String, nullable=False)
    quantite_produit_fini     = Column(Float,  nullable=True)   # objectif PF (puis réel)
    quantite_matiere_premiere = Column(Float,  nullable=True)   # rempli depuis étape 1
    statut                    = Column(Enum(StatutProduction), default=StatutProduction.EN_ATTENTE)
    date                      = Column(Date, default=date.today)

    # relations
    of     = relationship("OF", back_populates="productions")
    etapes = relationship("EtapeProduction", back_populates="production",
                          order_by="EtapeProduction.ordre", cascade="all, delete-orphan")
    rebuts = relationship("Rebut", back_populates="production")


# ─────────────────────────────────────────────
#  ÉTAPE PRODUCTION
# ─────────────────────────────────────────────

class EtapeProduction(Base):
    __tablename__ = "etapes_production"

    id            = Column(Integer, primary_key=True, index=True)
    production_id = Column(Integer, ForeignKey("productions.id"), nullable=False)
    ordre         = Column(Integer, nullable=False)
    machine       = Column(String,  nullable=False)
    nom_machine   = Column(String,  nullable=True)
    qte_entree    = Column(Float,   nullable=True)
    qte_sortie    = Column(Float,   nullable=True)
    operateur     = Column(String,  nullable=True)
    debut         = Column(String,  nullable=True)
    fin           = Column(String,  nullable=True)
    statut        = Column(Enum(StatutEtape), default=StatutEtape.EN_ATTENTE)
    date          = Column(Date, default=date.today)

    production = relationship("Production", back_populates="etapes")
    rebuts     = relationship("Rebut", back_populates="etape")


# ─────────────────────────────────────────────
#  REBUT
# ─────────────────────────────────────────────

class Rebut(Base):
    __tablename__ = "rebuts"

    id            = Column(Integer, primary_key=True, index=True)
    production_id = Column(Integer, ForeignKey("productions.id"), nullable=False)
    etape_id      = Column(Integer, ForeignKey("etapes_production.id"), nullable=True)
    machine       = Column(String,  nullable=False)
    defaut        = Column(String,  nullable=False)
    quantite      = Column(Float,   nullable=False)
    date          = Column(Date, default=date.today)

    production = relationship("Production", back_populates="rebuts")
    etape      = relationship("EtapeProduction", back_populates="rebuts")


# ─────────────────────────────────────────────
#  HISTORIQUE
# ─────────────────────────────────────────────

class HistoriqueProduction(Base):
    __tablename__ = "historique_production"

    id                        = Column(Integer, primary_key=True, index=True)
    machine                   = Column(String,  nullable=True)
    of_id                     = Column(Integer, nullable=True)
    production_id             = Column(Integer, nullable=True)
    etape_id                  = Column(Integer, nullable=True)
    quantite_produit_fini     = Column(Float,   nullable=True)
    quantite_matiere_premiere = Column(Float,   nullable=True)
    evenement                 = Column(String,  nullable=False)
    date                      = Column(Date, default=date.today)