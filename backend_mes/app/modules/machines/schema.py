"""Schémas Pydantic pour la gestion des machines."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ Machine ============

class MachineBase(BaseModel):
    """Schéma de base pour Machine."""
    name: str = Field(..., min_length=1, max_length=100)
    reference: str = Field(..., min_length=1, max_length=80)
    machine_type: str = Field(..., min_length=1, max_length=80)
    description: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=120)


class MachineCreate(MachineBase):
    """Schéma pour création de machine."""
    pass


class MachineUpdate(BaseModel):
    """Schéma pour mise à jour partielle de machine."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    reference: Optional[str] = Field(None, min_length=1, max_length=80)
    machine_type: Optional[str] = Field(None, min_length=1, max_length=80)
    description: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=120)


class MachineInDB(MachineBase):
    """Schéma Machine avec champs DB."""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MachineResponse(MachineInDB):
    """Réponse Machine avec état actuel (optionnel)."""
    current_state: Optional[str] = None
    current_state_started_at: Optional[datetime] = None


# ============ MachineStateHistory ============

class StateHistoryBase(BaseModel):
    """Schéma de base pour historique d'état."""
    state: str = Field(..., pattern="^(running|stopped|failure)$")
    started_at: datetime
    ended_at: Optional[datetime] = None
    comment: Optional[str] = Field(None, max_length=500)


class StateHistoryCreate(BaseModel):
    """Schéma pour créer une entrée d'historique."""
    state: str = Field(..., pattern="^(running|stopped|failure)$")
    started_at: Optional[datetime] = None  # default = now
    ended_at: Optional[datetime] = None
    comment: Optional[str] = Field(None, max_length=500)


class StateHistoryUpdate(BaseModel):
    """Schéma pour mettre à jour (notamment ended_at)."""
    ended_at: Optional[datetime] = None
    comment: Optional[str] = Field(None, max_length=500)


class StateHistoryResponse(BaseModel):
    """Réponse pour une entrée d'historique."""
    id: int
    machine_id: int
    state: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ État actuel ============

class MachineCurrentState(BaseModel):
    """État actuel d'une machine."""
    machine_id: int
    current_state: str  # running, stopped, failure
    started_at: datetime
    is_active: bool = True  # True si ended_at est None


class ChangeStateRequest(BaseModel):
    """Requête pour changer l'état d'une machine."""
    state: str = Field(..., pattern="^(running|stopped|failure)$")
    comment: Optional[str] = Field(None, max_length=500)
