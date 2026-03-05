from sqlalchemy.orm import Session
from . import model, schema


# =========================
# PRODUCTION
# =========================
def create_production(db: Session, data: schema.ProductionCreate):
    prod = model.Production(**data.dict())
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod


def get_all_productions(db: Session):
    return db.query(model.Production).all()


# =========================
# REBUTS
# =========================
def create_rebut(db: Session, data: schema.RebutCreate):
    rebut = model.Rebut(**data.dict())
    db.add(rebut)
    db.commit()
    db.refresh(rebut)
    return rebut


def get_all_rebuts(db: Session):
    return db.query(model.Rebut).all()


# =========================
# TEMPS MACHINE
# =========================
def create_temps(db: Session, data: schema.TempsCreate):
    temps = model.TempsMachine(**data.dict())
    db.add(temps)
    db.commit()
    db.refresh(temps)
    return temps


def get_all_temps(db: Session):
    return db.query(model.TempsMachine).all()