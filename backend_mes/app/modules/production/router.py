"""
router.py – Production MES · Pipeline automatique

FIX CRITIQUE : /rebuts/ déclaré AVANT /{production_id}
→ FastAPI ne capturera plus "rebuts" comme un int (422 corrigé)
→ Plus de 307 redirect
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from . import service, schema


router = APIRouter(prefix="/productions", tags=["Production MES"])


# ─────────────────────────────────────────────
#  REBUTS  ← EN PREMIER, avant /{production_id}
# ─────────────────────────────────────────────

@router.post("/rebuts/", response_model=schema.RebutResponse)
def create_rebut(data: schema.RebutCreate, db: Session = Depends(get_db)):
    return service.create_rebut(db, data)


@router.get("/rebuts/", response_model=list[schema.RebutResponse])
def get_rebuts(db: Session = Depends(get_db)):
    return service.get_all_rebuts(db)


# ─────────────────────────────────────────────
#  PRODUCTION
# ─────────────────────────────────────────────

@router.get("/", response_model=list[schema.ProductionSummaryResponse])
def get_productions(of_id: int | None = None, db: Session = Depends(get_db)):
    return service.get_productions(db, of_id=of_id)


@router.post("/", response_model=schema.ProductionResponse)
def create_production(data: schema.ProductionCreate, db: Session = Depends(get_db)):
    return service.create_production(db, data)


@router.get("/{production_id}", response_model=schema.ProductionResponse)
def get_production(production_id: int, db: Session = Depends(get_db)):
    return service.get_production(db, production_id)


# ─────────────────────────────────────────────
#  PIPELINE
# ─────────────────────────────────────────────

@router.get(
    "/{production_id}/etape-courante",
    response_model=schema.EtapeResponse,
)
def get_etape_courante(production_id: int, db: Session = Depends(get_db)):
    return service.get_etape_courante(db, production_id)


@router.post(
    "/{production_id}/avancer",
    response_model=schema.PipelineStateResponse,
)
async def avancer_pipeline(
    production_id: int,
    data: schema.EtapeCreate,
    db: Session = Depends(get_db),
):
    return await service.avancer_pipeline(db, production_id, data)


@router.get("/{production_id}/etapes", response_model=list[schema.EtapeResponse])
def get_etapes(production_id: int, db: Session = Depends(get_db)):
    return service.get_etapes(db, production_id)