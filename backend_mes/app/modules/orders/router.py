from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from .model import OF
from datetime import date

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

# 🔥 FONCTION AUTO CLÔTURE
def auto_close_of(of, db: Session):
    total_produit = sum(p.quantite for p in of.productions)

    if total_produit >= of.quantite and of.statut != "Terminé":
        of.statut = "Terminé"
        of.date_fin_reelle = date.today()
        db.commit()
