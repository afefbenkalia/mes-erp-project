from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from app.database import Base
from datetime import datetime


class Notification(Base):
    __tablename__ = "notifications"

    id          = Column(Integer, primary_key=True, autoincrement=True, index=True)
    type        = Column(String(50),  nullable=False)
    title       = Column(String(500), nullable=False)
    target_role = Column(String(50),  nullable=False, index=True)
    payload     = Column(JSON,        nullable=True)
    is_read     = Column(Boolean,     default=False, nullable=False)
    created_at  = Column(DateTime,    default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    cin = Column(String, unique=True, nullable=False, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="operator")
    is_active = Column(Boolean, default=True)
    is_first_login = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    login_count = Column(Integer, nullable=False, default=0)
    last_access = Column(DateTime, nullable=True)
    erp_access = Column(Boolean, default=False, nullable=False)