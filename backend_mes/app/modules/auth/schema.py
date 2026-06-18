from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# Admin creates users with these fields (NO password from admin)
class UserCreateByAdmin(BaseModel):
    cin: str = Field(..., pattern="^\\d{8}$")
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role: str = Field(default="operator", pattern="^(admin|manager|operator|maintenance)$")
    erp_access: bool = False


class UserUpdateByAdmin(BaseModel):
    cin: str = Field(..., pattern="^\\d{8}$")
    nom: str = Field(..., min_length=1, max_length=100)
    prenom: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    role: str = Field(..., pattern="^(admin|manager|operator|maintenance)$")
    is_active: bool = True
    erp_access: bool = False


# User logs in with email and password
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# User changes password (new password required)
class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


# Response after login
class UserResponse(BaseModel):
    id: int
    cin: str
    nom: str
    prenom: str
    email: str
    role: str
    is_active: bool
    is_first_login: bool
    erp_access: bool
    created_at: datetime
    last_login: Optional[datetime]
    login_count: int
    last_access: Optional[datetime]

    class Config:
        from_attributes = True


# Login response with token and force_change_password flag
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    force_change_password: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    target_role: str
    payload: Optional[dict] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OperatorResponse(BaseModel):
    id: int
    nom: str
    prenom: str

    class Config:
        from_attributes = True


class RoleStat(BaseModel):
    role: str
    count: int


class UserStatsResponse(BaseModel):
    total: int
    active: int
    inactive: int
    created_this_month: int
    growth_percentage: float
    per_role: list[RoleStat]