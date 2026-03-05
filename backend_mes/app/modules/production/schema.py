from pydantic import BaseModel
from datetime import date

# =========================
# PRODUCTION
# =========================
class ProductionBase(BaseModel):
    machine: str
    of: str
    fibre: str
    quantite: float
    operateur: str
    debut: str
    fin: str


class ProductionCreate(ProductionBase):
    pass


class ProductionResponse(ProductionBase):
    id: int
    date: date

    class Config:
        from_attributes = True


# =========================
# REBUT
# =========================
class RebutBase(BaseModel):
    machine: str
    of: str
    defaut: str
    quantite: float


class RebutCreate(RebutBase):
    pass


class RebutResponse(RebutBase):
    id: int
    date: date

    class Config:
        from_attributes = True


# =========================
# TEMPS MACHINE
# =========================
class TempsBase(BaseModel):
    machine: str
    fonctionnement: float
    arret: float


class TempsCreate(TempsBase):
    pass


class TempsResponse(TempsBase):
    id: int
    date: date

    class Config:
        from_attributes = True