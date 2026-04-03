from sqlalchemy.orm import Session, joinedload
from . import model


# =========================
# GET ALL LOTS
# =========================
def get_all_lots(db: Session):
    return (
        db.query(model.Lot)
        .options(joinedload(model.Lot.steps))
        .all()
    )


# =========================
# GET LOT BY NUMBER
# =========================
def get_lot(db: Session, numero_lot: str):
    return (
        db.query(model.Lot)
        .options(joinedload(model.Lot.steps))
        .filter(model.Lot.numero_lot == numero_lot)
        .first()
    )


# =========================
# GET BY STATUS
# =========================
def get_by_status(db: Session, status: str):
    return (
        db.query(model.Lot)
        .options(joinedload(model.Lot.steps))
        .filter(model.Lot.status == status)
        .all()
    )


# =========================
# CREATE LOT + STEPS AUTO
# =========================
def create_lot(db: Session, lot_data):
    try:
        # 1. CREATE LOT
        new_lot = model.Lot(**lot_data.dict())

        db.add(new_lot)
        db.commit()
        db.refresh(new_lot)

        # 2. STEPS AUTOMATIQUES
        default_steps = [
            "Cardage",
            "Filage",
            "Bobinage",
            "Contrôle qualité",
            "Conditionnement"
        ]

        steps = []

        for op in default_steps:
            steps.append(model.Step(
                operation=op,
                machine=None,
                operateur=None,
                status="pending",
                duree_min=0,
                quantite=0,
                lot_id=new_lot.id
            ))

        db.add_all(steps)
        db.commit()

        db.refresh(new_lot)

        return new_lot

    except Exception as e:
        db.rollback()
        print("ERROR create_lot:", str(e))
        raise


# =========================
# ADD STEP MANUAL
# =========================
def add_step(db: Session, lot_id: int, step_data):
    step = model.Step(**step_data.dict(), lot_id=lot_id)
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


# =========================
# KPI CALCULATION
# =========================
def calculate_kpi(lot):
    if not lot:
        return {}

    steps = lot.steps or []

    rendement = (
        (lot.quantite_finale / lot.quantite_initiale) * 100
        if lot.quantite_initiale and lot.quantite_initiale > 0
        else 0
    )

    return {
        "rendement": round(rendement, 2),
        "total_steps": len(steps),
        "completed_steps": sum(1 for s in steps if s.status == "completed"),
        "duration": sum(s.duree_min or 0 for s in steps)
    }