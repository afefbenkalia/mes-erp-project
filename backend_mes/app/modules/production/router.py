from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from . import service, schema, model

router = APIRouter(prefix="/productions", tags=["Production"])


# =========================
# PRODUCTIONS
# =========================

@router.get("/", response_model=list[schema.ProductionResponse])
def get_productions(of_id: int | None = None, db: Session = Depends(get_db)):

    if of_id:
        return db.query(model.Production).filter(
            model.Production.of_id == of_id
        ).all()

    return db.query(model.Production).all()


@router.post("/", response_model=schema.ProductionResponse)
def create_production(data: schema.ProductionCreate, db: Session = Depends(get_db)):
    return service.create_production(db, data)


# =========================
# REBUTS
# =========================

@router.post("/rebuts", response_model=schema.RebutResponse)
def create_rebut(data: schema.RebutCreate, db: Session = Depends(get_db)):
    return service.create_rebut(db, data)


@router.get("/rebuts", response_model=list[schema.RebutResponse])
def get_rebuts(db: Session = Depends(get_db)):
    return service.get_all_rebuts(db)


# =========================
# TEMPS MACHINE
# =========================

@router.post("/temps", response_model=schema.TempsResponse)
def create_temps(data: schema.TempsCreate, db: Session = Depends(get_db)):
    return service.create_temps(db, data)


@router.get("/temps", response_model=list[schema.TempsResponse])
def get_temps(db: Session = Depends(get_db)):
    return service.get_all_temps(db)