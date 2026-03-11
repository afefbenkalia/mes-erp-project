from sqlalchemy.orm import Session
from . import model, schema

# ----------------
# OF (Ordres de Fabrication)
# ----------------

def create_of(db: Session, data: schema.OFCreate):
    new_of = model.OF(**data.model_dump())  # 🔹 model_dump() pour Pydantic v2
    db.add(new_of)
    db.commit()
    db.refresh(new_of)
    return new_of

def get_all_ofs(db: Session):
    return db.query(model.OF).all()

def get_of_by_id(db: Session, of_id: int):
    return db.query(model.OF).filter(model.OF.id == of_id).first()