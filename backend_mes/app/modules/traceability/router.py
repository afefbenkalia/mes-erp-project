from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from fastapi.responses import FileResponse

from app.modules.traceability import service, schema, pdf_service

router = APIRouter(prefix="/traceability", tags=["Traceability"])


# 🔹 GET ALL
@router.get("/lots", response_model=list[schema.LotOut])
def get_lots(db: Session = Depends(get_db)):
    return service.get_all_lots(db)


# 🔹 GET ONE
@router.get("/lots/{numero_lot}", response_model=schema.LotOut)
def get_lot(numero_lot: str, db: Session = Depends(get_db)):
    lot = service.get_lot(db, numero_lot)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouvé")
    return lot


# 🔹 CREATE LOT (AUTO STEPS)
@router.post("/lots", response_model=schema.LotOut)
def create_lot(lot_data: schema.LotCreate, db: Session = Depends(get_db)):
    return service.create_lot(db, lot_data)


# 🔹 FILTER
@router.get("/lots/status/{status}", response_model=list[schema.LotOut])
def get_status(status: str, db: Session = Depends(get_db)):
    return service.get_by_status(db, status)


# 🔹 ADD STEP
@router.post("/lots/{lot_id}/steps", response_model=schema.StepOut)
def add_step(lot_id: int, step: schema.StepCreate, db: Session = Depends(get_db)):
    return service.add_step(db, lot_id, step)


# 🔹 EXPORT PDF
@router.get("/lots/{numero_lot}/pdf")
def export_pdf(numero_lot: str, db: Session = Depends(get_db)):
    lot = service.get_lot(db, numero_lot)

    if not lot:
        raise HTTPException(status_code=404, detail="Lot non trouvé")

    kpi = service.calculate_kpi(lot)

    file_path = pdf_service.generate_pdf(lot, kpi)

    return FileResponse(path=file_path, filename=f"{numero_lot}.pdf")