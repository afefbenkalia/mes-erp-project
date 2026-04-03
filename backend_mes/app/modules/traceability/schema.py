from pydantic import BaseModel
from typing import Optional, List, Dict


class StepBase(BaseModel):
    operation: str
    machine: Optional[str] = None
    operateur: Optional[str] = None
    status: str
    duree_min: Optional[int] = None
    quantite: Optional[int] = None
    parametres: Optional[Dict] = None
    qualite: Optional[Dict] = None


class StepCreate(StepBase):
    pass


class StepOut(StepBase):
    id: int

    class Config:
        from_attributes = True


class LotBase(BaseModel):
    numero_lot: str
    produit: str
    ordre_id: Optional[str] = None
    date_creation: str
    quantite_initiale: int
    quantite_finale: int
    status: str


class LotCreate(LotBase):
    pass


class LotOut(LotBase):
    id: int
    steps: List[StepOut] = []

    class Config:
        from_attributes = True