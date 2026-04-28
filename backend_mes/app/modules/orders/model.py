from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.orm import relationship
from app.database import Base

class OF(Base):
    __tablename__ = "ordres_fabrication"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, unique=True, nullable=False)
    produit = Column(String, nullable=False)
    quantite = Column(Integer, nullable=False)
    date_debut = Column(Date, nullable=True)
    date_fin = Column(Date, nullable=True)
    # ⚠️ Supprimer le champ statut de la base de données
    # statut = Column(String, default="Planifié")  # À SUPPRIMER

    productions = relationship("Production", back_populates="of")