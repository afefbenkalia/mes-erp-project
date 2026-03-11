# app/modules/orders/schema.py
from pydantic import BaseModel
from datetime import date
from typing import List

class OFCreate(BaseModel):
    numero: str
    machine: str
    produit: str
    quantite: int
    date_debut: date
    date_fin: date
    statut: str = "Planifié"

class ProductionSchema(BaseModel):
    id: int
    quantite: float
    statut: str

    model_config = {"from_attributes": True}

class OFResponse(BaseModel):
    id: int
    numero: str
    machine: str
    produit: str
    quantite: int
    date_debut: date
    date_fin: date
    statut: str

    model_config = {"from_attributes": True}

class OFWithProductions(OFResponse):
    productions: List[ProductionSchema] = []