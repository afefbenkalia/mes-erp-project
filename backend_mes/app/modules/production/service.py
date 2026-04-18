from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.modules.production.model import Production, HistoriqueProduction
from app.modules.orders.model import OF


def create_production(db: Session, data):
    """Crée une production et met à jour le statut de l'OF"""
    
    # Rechercher l'OF par ID
    of = db.query(OF).filter(OF.id == data.of_id).first()

    if not of:
        raise HTTPException(status_code=404, detail="OF introuvable")

    # Créer l'enregistrement de production
    prod = Production(
        machine=data.machine,
        produit_fini=data.produit_fini,
        quantite_produit_fini=data.quantite_produit_fini,
        quantite_matiere_premiere=data.quantite_matiere_premiere,
        operateur=data.operateur,
        debut=data.debut,
        fin=data.fin,
        of_id=of.id,
        of_numero=of.numero
    )

    db.add(prod)
    db.commit()
    db.refresh(prod)

    # Ajouter à l'historique
    hist = HistoriqueProduction(
        machine=prod.machine,
        of_id=prod.of_id,
        quantite_produit_fini=prod.quantite_produit_fini,
        quantite_matiere_premiere=prod.quantite_matiere_premiere,
        evenement="production"
    )
    db.add(hist)
    db.commit()

    # Le statut de l'OF n'est PAS stocké en base
    # Il sera calculé dynamiquement lors des requêtes GET
    
    return prod


def create_rebut(db: Session, data):

    rebut = model.Rebut(**data.dict())
    db.add(rebut)
    db.commit()
    db.refresh(rebut)

    hist = model.HistoriqueProduction(
        machine=rebut.machine,
        quantite_produit_fini=rebut.quantite,
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