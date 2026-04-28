from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db  # Importez le get_db commun
from .model import OF
from .schema import OFCreate, OFOut
from typing import List

router = APIRouter(
    prefix="/ordres-fabrication",
    tags=["Ordres Fabrication"]
)

def compute_statut(of: OF) -> str:
    """Calcule le statut dynamiquement en fonction des productions enregistrées"""
    if not of.productions or len(of.productions) == 0:
        return "Planifié"

    # Somme de toutes les quantités produites pour cet OF
    produced = sum(
        float(p.quantite_produit_fini or 0)
        for p in of.productions
    )

    if produced >= float(of.quantite):
        return "Terminé"
    elif produced > 0:
        return "En cours"
    else:
        return "Planifié"

# GET - Liste tous les OFs avec statut calculé dynamiquement
@router.get("/", response_model=List[OFOut])
def get_ofs(db: Session = Depends(get_db)):  # Utilisez get_db commun
    ofs = db.query(OF).all()
    # Calculer le statut pour chaque OF
    for of in ofs:
        of.statut = compute_statut(of)
    return ofs

# GET - Un seul OF par ID
@router.get("/{of_id}", response_model=OFOut)
def get_of(of_id: int, db: Session = Depends(get_db)):  # Utilisez get_db commun
    of = db.query(OF).filter(OF.id == of_id).first()
    if not of:
        raise HTTPException(status_code=404, detail="OF non trouvé")
    of.statut = compute_statut(of)
    return of

# POST - Réception depuis ERP
@router.post("/", response_model=OFOut, status_code=201)
def create_of(of_data: OFCreate, db: Session = Depends(get_db)):  # Utilisez get_db commun
    existing = db.query(OF).filter(OF.numero == of_data.numero).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"OF {of_data.numero} déjà existant dans le MES"
        )
    
    new_of = OF(
        numero=of_data.numero,
       
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

# DELETE - Supprimer un OF
@router.delete("/{of_id}")
def delete_of(of_id: int, db: Session = Depends(get_db)):  # Utilisez get_db commun
    of = db.query(OF).filter(OF.id == of_id).first()
    if not of:
        raise HTTPException(status_code=404, detail="OF non trouvé")
    db.delete(of)
    db.commit()
    return {"message": f"OF {of.numero} supprimé"}