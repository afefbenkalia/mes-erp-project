# mes/orders/router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from .model import OF
from .schema import OFCreate, OFOut

router = APIRouter(prefix="/ordres-fabrication", tags=["Ordres Fabrication"])


def compute_statut(of: OF) -> str:
    if not of.productions or len(of.productions) == 0:
        return "Planifié"
    produced = sum(float(p.quantite_produit_fini or 0) for p in of.productions)
    if produced >= float(of.quantite):
        return "Terminé"
    elif produced > 0:
        return "En cours"
    return "Planifié"


@router.get("/", response_model=List[OFOut])
def get_ofs(db: Session = Depends(get_db)):
    ofs = db.query(OF).all()
    for of in ofs:
        of.statut = compute_statut(of)
    return ofs


@router.get("/{of_id}", response_model=OFOut)
def get_of(of_id: int, db: Session = Depends(get_db)):
    of = db.query(OF).filter(OF.id == of_id).first()
    if not of:
        raise HTTPException(status_code=404, detail="OF non trouvé")
    of.statut = compute_statut(of)
    return of


@router.post("/", response_model=OFOut, status_code=201)
def create_of(of_data: OFCreate, db: Session = Depends(get_db)):
    existing = db.query(OF).filter(OF.numero == of_data.numero).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"OF {of_data.numero} déjà existant dans le MES")

    new_of = OF(
        numero=of_data.numero,
        # ✅ SUPPRIMÉ: machine
        produit=of_data.produit,
        quantite=of_data.quantite,
        date_debut=of_data.date_debut,
        date_fin=of_data.date_fin,
    )
    db.add(new_of)
    db.commit()
    db.refresh(new_of)
    new_of.statut = compute_statut(new_of)
    return new_of


@router.delete("/{of_id}")
def delete_of(of_id: int, db: Session = Depends(get_db)):
    of = db.query(OF).filter(OF.id == of_id).first()
    if not of:
        raise HTTPException(status_code=404, detail="OF non trouvé")
    db.delete(of)
    db.commit()
    return {"message": f"OF {of.numero} supprimé"}