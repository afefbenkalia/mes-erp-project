from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from fastapi.responses import FileResponse
from app.modules.traceability import service, pdf_service

router = APIRouter(prefix="/traceability")

@router.get("/lots")
def get_lots(db: Session = Depends(get_db)):
    return service.get_all_lots(db)

@router.get("/lots/{numero_lot}")
def get_lot(numero_lot: str, db: Session = Depends(get_db)):
    return service.get_lot(db, numero_lot)

@router.get("/lots/status/{status}")
def get_status(status: str, db: Session = Depends(get_db)):
    return service.get_by_status(db, status)

@router.get("/lots/{numero_lot}/export")
def export_pdf(numero_lot: str, db: Session = Depends(get_db)):
    lot = service.get_lot(db, numero_lot)
    kpi = service.calculate_kpi(lot)

    file_path = pdf_service.generate_pdf(lot, kpi)

    return FileResponse(file_path, filename=f"{numero_lot}.pdf")