from pydantic import BaseModel, Field
from typing import Optional


class OperatorActionCreate(BaseModel):
    machine_id: int
    action: str = Field(..., pattern="^(MARCHE|PAUSE|ERREUR)$")
    comment: Optional[str] = None


class OperatorActionResponse(BaseModel):
    id: int
    machine_id: int
    action: str
    comment: Optional[str]

    class Config:
        from_attributes = True