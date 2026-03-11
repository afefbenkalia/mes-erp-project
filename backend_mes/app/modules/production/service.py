from sqlalchemy.orm import Session
from . import model


def create_production(db: Session, data):

    prod = model.Production(**data.dict())
    db.add(prod)
    db.commit()
    db.refresh(prod)

    hist = model.HistoriqueProduction(
        machine=prod.machine,
        of_id=prod.of_id,
        quantite=prod.quantite,
        evenement="production"
    )

    db.add(hist)
    db.commit()

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