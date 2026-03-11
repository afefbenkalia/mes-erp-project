from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.orm import relationship
from app.database import Base

# 🔹 Import Production pour la relation
from ..production.model import Production

class OF(Base):
    __tablename__ = "ordres_fabrication"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, nullable=False)
    machine = Column(String, nullable=False)
    produit = Column(String, nullable=False)
    quantite = Column(Integer, nullable=False)
    date_debut = Column(Date)
    date_fin = Column(Date)

    productions = relationship("Production", back_populates="of")