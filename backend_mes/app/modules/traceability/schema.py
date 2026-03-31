from pydantic import BaseModel
from typing import List

class Step(BaseModel):
    operation: str
    machine: str
    operateur: str
    status: str
    duree_min: int
    quantite: int
    parametres: dict
    qualite: dict

    class Config:
        orm_mode = True


class Lot(BaseModel):
    numero_lot: str
    produit: str
    ordre_id: str
    date_creation: str
    quantite_initiale: int
    quantite_finale: int
    status: str
    steps: List[Step] = []

    class Config:
        orm_mode = True