
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.modules.production.model import Production
from app.modules.orders.model import OF
from app.modules.production import model



def create_production(db, data):
    # rechercher l'OF par numero
    of = db.query(OF).filter(OF.id == data.of_id).first()

    if not of:
        raise HTTPException(status_code=404, detail="OF introuvable")

    prod = Production(
        machine=data.machine,
        fibre=data.fibre,
        quantite=data.quantite,
        operateur=data.operateur,
        debut=data.debut,
        fin=data.fin,
        of_id=of.id,
        of_numero=of.numero
    )

    db.add(prod)
    db.commit()
    db.refresh(prod)

    return prod


def create_rebut(db: Session, data):

    rebut = model.Rebut(**data.dict())
    db.add(rebut)
    db.commit()
    db.refresh(rebut)

    hist = model.HistoriqueProduction(
        machine=rebut.machine,
        quantite=rebut.quantite,
        evenement="rebut"
    )

    db.add(hist)
    db.commit()

    return rebut


def get_all_rebuts(db: Session):
    return db.query(model.Rebut).all()


def create_temps(db: Session, data):

    temps = model.TempsMachine(**data.dict())
    db.add(temps)
    db.commit()
    db.refresh(temps)

    hist = model.HistoriqueProduction(
        machine=temps.machine,
        evenement="temps_machine"
    )

    db.add(hist)
    db.commit()

    return temps


def get_all_temps(db: Session):
    return db.query(model.TempsMachine).all()