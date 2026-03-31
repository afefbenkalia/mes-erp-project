from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Lot(Base):
    __tablename__ = "lots"

    id = Column(Integer, primary_key=True)
    numero_lot = Column(String, unique=True)
    produit = Column(String)
    ordre_id = Column(String)
    date_creation = Column(String)
    quantite_initiale = Column(Integer)
    quantite_finale = Column(Integer)
    status = Column(String)

    steps = relationship("Step", back_populates="lot")


class Step(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True)
    operation = Column(String)
    machine = Column(String)
    operateur = Column(String)
    status = Column(String)
    duree_min = Column(Integer)
    quantite = Column(Integer)

    parametres = Column(JSON)
    qualite = Column(JSON)

    lot_id = Column(Integer, ForeignKey("lots.id"))
    lot = relationship("Lot", back_populates="steps")