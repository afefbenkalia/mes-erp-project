from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from .model import User
from .schema import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(func.lower(User.email) == normalize_email(email)).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user: UserCreate):
    existing = get_user_by_email(db, user.email)
    if existing:
        raise ValueError("Email already exists")

    db_user = User(
        name=user.name.strip(),
        email=normalize_email(user.email),
        hashed_password=hash_password(user.password),
        role=user.role,
        phone=user.phone.strip() if user.phone else None,
        status=user.status,
        is_active=user.is_active,
        created_at=datetime.utcnow()
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    user.last_access = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return user


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()


def get_all_users(db: Session):
    return db.query(User).order_by(User.created_at.desc()).all()


def update_user(db: Session, user_id: int, data: UserUpdate):
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    update_data = data.dict(exclude_unset=True)

    if "email" in update_data and update_data["email"]:
        update_data["email"] = normalize_email(update_data["email"])
        existing = get_user_by_email(db, update_data["email"])
        if existing and existing.id != user_id:
            raise ValueError("Email already exists")

    if "password" in update_data:
        if update_data["password"]:
            update_data["hashed_password"] = hash_password(update_data["password"])
        del update_data["password"]

    # 🔥 FIX phone
    if "phone" in update_data:
        update_data["phone"] = update_data["phone"].strip() if update_data["phone"] else None

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int):
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    db.delete(user)
    db.commit()
    return True


def get_users_count(db: Session):
    return db.query(User).count()