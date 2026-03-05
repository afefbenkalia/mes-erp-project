from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from . import service, schema

router = APIRouter(
    prefix="/productions",
    tags=["Productions"]
)

@router.post("")
def create(data: schema.ProductionCreate, db: Session = Depends(get_db)):
    return service.create_production(db, data)

@router.get("")
def get_all(db: Session = Depends(get_db)):
    return service.get_all_productions(db)


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