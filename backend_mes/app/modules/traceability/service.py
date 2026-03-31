from sqlalchemy.orm import Session
from app.modules.traceability.model import Lot

def get_all_lots(db: Session):
    return db.query(Lot).all()

def get_lot(db: Session, numero_lot: str):
    return db.query(Lot).filter(Lot.numero_lot == numero_lot).first()

def get_by_status(db: Session, status: str):
    return db.query(Lot).filter(Lot.status == status).all()

def calculate_kpi(lot):
    total_steps = len(lot.steps)
    completed = len([s for s in lot.steps if s.status == "completed"])
    defects = len([s for s in lot.steps if s.status == "defect"])
    duration = sum([s.duree_min for s in lot.steps])

    rendement = (lot.quantite_finale / lot.quantite_initiale) * 100

    return {
        "total_steps": total_steps,
        "completed": completed,
        "defects": defects,
        "duration": duration,
        "rendement": round(rendement, 2)
    }