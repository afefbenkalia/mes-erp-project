from pydantic import BaseModel
from datetime import datetime

class ProductionBase(BaseModel):
    id_ordre: int
    quantite_produite: int
    quantite_rebut: int

class ProductionCreate(ProductionBase):
    pass

class Production(ProductionBase):
    id_production: int
    date_enregistrement: datetime

    class Config:
        from_attributes = True  # v2 de Pydantic (remplace orm_mode)