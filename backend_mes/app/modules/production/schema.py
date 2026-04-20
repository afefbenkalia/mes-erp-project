from pydantic import BaseModel
from datetime import date
from typing import Optional


# =================
# PRODUCTION
# =================

class ProductionCreate(BaseModel):
    machine: str
    produit_fini: str
    fibre: str   # ✅ زيدها
    quantite_produit_fini: float
    quantite_matiere_premiere: float
    operateur: Optional[str] = None
    debut: Optional[str] = None
    fin: Optional[str] = None
    of_id: int

class ProductionResponse(ProductionCreate):
    id: int
    date: date

    class Config:
        from_attributes = True


# =================
# REBUT
# =================

class RebutCreate(BaseModel):
    production_id: int
    machine: str
    defaut: str
    quantite: float


class RebutResponse(RebutCreate):
    id: int
    date: date

    class Config:
        from_attributes = True


# =================
# TEMPS MACHINE
# =================

class TempsCreate(BaseModel):
    machine: str
    fonctionnement: float
    arret: float


class TempsResponse(TempsCreate):
    id: int
    date: date

    class Config:
        from_attributes = True

      