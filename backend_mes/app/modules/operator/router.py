from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from .schema import OperatorActionCreate, OperatorActionResponse
from .service import operator_change_state

router = APIRouter(prefix="/operator", tags=["operator"])


@router.post("/change-state", response_model=OperatorActionResponse)
def change_state_operator(
    data: OperatorActionCreate,
    db: Session = Depends(get_db)
):
    return operator_change_state(db, data)