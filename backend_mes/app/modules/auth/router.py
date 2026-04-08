from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from . import service, schema
from app.core.security import create_token

# IMPORTANT: Le préfixe est déjà "/auth" dans main.py
# Donc ici on utilise prefix="" pour éviter /auth/auth/
router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=schema.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: schema.UserCreate, db: Session = Depends(get_db)):
    """Inscription d'un nouvel utilisateur"""
    try:
        return service.create_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=schema.LoginResponse)
def login(data: schema.UserLogin, db: Session = Depends(get_db)):
    """Connexion utilisateur"""
    user = service.authenticate(db, data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    token = create_token({"sub": user.email, "role": user.role, "user_id": user.id})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/users", response_model=List[schema.UserResponse])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Récupérer les utilisateurs avec pagination"""
    return service.get_users(db, skip, limit)


@router.get("/users/all", response_model=List[schema.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    """Récupérer TOUS les utilisateurs"""
    return service.get_all_users(db)


@router.get("/users/{user_id}", response_model=schema.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Récupérer un utilisateur par son ID"""
    user = service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    return user


@router.post("/users", response_model=schema.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: schema.UserCreate,
    db: Session = Depends(get_db)
):
    """Créer un nouvel utilisateur"""
    try:
        return service.create_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/users/{user_id}", response_model=schema.UserResponse)
def update_user(
    user_id: int,
    user_data: schema.UserUpdate,
    db: Session = Depends(get_db)
):
    """Mettre à jour un utilisateur"""
    try:
        user = service.update_user(db, user_id, user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Supprimer un utilisateur"""
    result = service.delete_user(db, user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    return {"message": "Utilisateur supprimé avec succès", "user_id": user_id}


@router.get("/stats/count")
def get_users_count(db: Session = Depends(get_db)):
    """Obtenir le nombre total d'utilisateurs"""
    count = service.get_users_count(db)
    return {"total_users": count}