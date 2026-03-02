from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from . import model, schema
from app.database import get_db  # Import absolu depuis app/

router = APIRouter(prefix="/production", tags=["Production"])

# Créer un enregistrement production
@router.post("/", response_model=schema.Production)
def create_production(production: schema.ProductionCreate, db: Session = Depends(get_db)):
    db_prod = model.Production(**production.dict())
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    return db_prod

# Lire tous les enregistrements
@router.get("/", response_model=list[schema.Production])
def read_production(db: Session = Depends(get_db)):
    return db.query(model.Production).all()