from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from app.database import Base  # Base SQLAlchemy global

class Production(Base):
    __tablename__ = "production"

    id_production = Column(Integer, primary_key=True, index=True)
    id_ordre = Column(Integer, nullable=False)  # plus tard tu pourras ajouter ForeignKey('orders.id_ordre')
    quantite_produite = Column(Integer, nullable=False)
    quantite_rebut = Column(Integer, nullable=False)
    date_enregistrement = Column(DateTime(timezone=True), server_default=func.now())