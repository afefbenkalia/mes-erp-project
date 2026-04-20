from sqlalchemy.orm import Session
from . import model, schema

# ----------------
# OF (Ordres de Fabrication)
# ----------------



def get_all_ofs(db: Session):
    return db.query(model.OF).all()

def get_of_by_id(db: Session, of_id: int):
    return db.query(model.OF).filter(model.OF.id == of_id).first()