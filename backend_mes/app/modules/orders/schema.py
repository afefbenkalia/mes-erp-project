# mes/orders/schema.py
from pydantic import BaseModel
from typing import Optional
from datetime import date


class OFCreate(BaseModel):
    numero: str
    # ✅ SUPPRIMÉ: machine
    produit: str
    quantite: int
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None


class OFOut(BaseModel):
    id: int
    numero: str
    # ✅ SUPPRIMÉ: machine
    produit: str
    quantite: int
    date_debut: Optional[date]
    date_fin: Optional[date]
    statut: str   # calculé dynamiquement

    class Config:
        from_attributes = True