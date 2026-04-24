# mes/orders/model.py
from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.orm import relationship
from app.database import Base


class OF(Base):
    __tablename__ = "ordres_fabrication"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, nullable=False)
    # ✅ SUPPRIMÉ: machine — la machine est dans chaque ligne de Production
    produit = Column(String, nullable=False)   # "Ruban 100% coton" etc.
    quantite = Column(Integer, nullable=False)  # quantité cible kg
    date_debut = Column(Date, nullable=True)
    date_fin = Column(Date, nullable=True)

    productions = relationship("Production", back_populates="of")