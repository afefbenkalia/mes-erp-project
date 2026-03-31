from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from .model import OF

router = APIRouter(
    prefix="/ordres-fabrication",
    tags=["Ordres Fabrication"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔹 GET tous les OF
@router.get("/")
def get_ofs(db: Session = Depends(get_db)):
    return db.query(OF).all()

# 🔹 CREATE OF
@router.post("/")
def create_of(data: dict, db: Session = Depends(get_db)):
     # vérifier si OF existe
    existing = db.query(OF).filter(OF.numero == data["numero"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="OF déjà existant")

    new_of = OF(**data)
    db.add(new_of)
    db.commit()
    db.refresh(new_of)
    return new_of