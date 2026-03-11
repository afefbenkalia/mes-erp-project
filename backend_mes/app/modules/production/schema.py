from pydantic import BaseModel
from datetime import date


# =================
# PRODUCTION
# =================

class ProductionCreate(BaseModel):
    machine: str
    fibre: str
    quantite: float
    operateur: str | None = None
    debut: str | None = None
    fin: str | None = None
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