from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from datetime import date
from app.database import Base


class Production(Base):
    __tablename__ = "productions"

    id = Column(Integer, primary_key=True, index=True)
    machine = Column(String, nullable=False)
    fibre = Column(String, nullable=False)
    quantite = Column(Float, nullable=False)
    operateur = Column(String)
    debut = Column(String)
    fin = Column(String)
    date = Column(Date, default=date.today)
    of_id = Column(Integer, ForeignKey("ordres_fabrication.id"))    # relation OF
   
   
    of = relationship("OF", back_populates="productions")

    # relation rebuts
    rebuts = relationship("Rebut", back_populates="production")


class Rebut(Base):
    __tablename__ = "rebuts"

    id = Column(Integer, primary_key=True, index=True)

    production_id = Column(Integer, ForeignKey("productions.id"))

    machine = Column(String, nullable=False)
    defaut = Column(String, nullable=False)
    quantite = Column(Float, nullable=False)

    date = Column(Date, default=date.today)

    production = relationship("Production", back_populates="rebuts")


class TempsMachine(Base):
    __tablename__ = "temps_machine"

    id = Column(Integer, primary_key=True, index=True)

    machine = Column(String, nullable=False)
    fonctionnement = Column(Float, nullable=False)
    arret = Column(Float, nullable=False)

    date = Column(Date, default=date.today)


class HistoriqueProduction(Base):
    __tablename__ = "historique_production"

    id = Column(Integer, primary_key=True, index=True)

    machine = Column(String)
    of_id = Column(Integer)
    quantite = Column(Float)

    evenement = Column(String)

    date = Column(Date, default=date.today)