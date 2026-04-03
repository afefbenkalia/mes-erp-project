from sqlalchemy import Column, Integer, String, Float, Date
from datetime import date
from app.database import Base


# =========================
# TABLE PRODUCTION
# =========================
class Production(Base):
    __tablename__ = "productions"

    id = Column(Integer, primary_key=True, index=True)
    machine = Column(String, nullable=False)
    of = Column(String, nullable=False)
    fibre = Column(String, nullable=False)
    quantite = Column(Float, nullable=False)
    operateur = Column(String, nullable=False)
    debut = Column(String)
    fin = Column(String)
    date = Column(Date, default=date.today)


# =========================
# TABLE REBUTS
# =========================
class Rebut(Base):
    __tablename__ = "rebuts"

    id = Column(Integer, primary_key=True, index=True)
    machine = Column(String, nullable=False)
    of = Column(String, nullable=False)
    defaut = Column(String, nullable=False)
    quantite = Column(Float, nullable=False)
    date = Column(Date, default=date.today)


# =========================
# TABLE TEMPS MACHINE
# =========================
class TempsMachine(Base):
    __tablename__ = "temps_machine"

    id = Column(Integer, primary_key=True, index=True)
    machine = Column(String, nullable=False)
    fonctionnement = Column(Float, nullable=False)
    arret = Column(Float, nullable=False)
    date = Column(Date, default=date.today)