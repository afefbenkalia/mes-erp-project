from pydantic import BaseModel
from typing import Optional, List
from datetime import date


# Schéma de réception depuis l'ERP
class OFCreate(BaseModel):
    numero: str
    machine: str
    produit: str
    quantite: int
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None


# Schéma de réponse
class OFOut(BaseModel):
    id: int
    numero: str
    machine: str
    produit: str
    quantite: int
    date_debut: Optional[date]
    date_fin: Optional[date]
    statut: str  # Ce champ est calculé, pas stocké en base

    class Config:
        from_attributes = True