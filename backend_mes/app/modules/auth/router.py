import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from . import service, schema
from app.core.security import create_token, get_current_user, get_apps_for_user
from typing import List
from app.modules.maintenance.realtime import maintenance_ws_manager


logger = logging.getLogger("auth_router")

# IMPORTANT: Le préfixe est déjà "/auth" dans main.py
router = APIRouter(tags=["Authentication"])


def _require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Réservé aux administrateurs")
    return current_user


@router.post("/create-user", response_model=schema.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_by_admin(
    user_data: schema.UserCreateByAdmin,
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """
    Admin creates a new user with temporary password.
    
    - Only admins can create users
    - User gets temporary password via email
    - User must change password on first login
    """
    try:
        # TODO: Verify current_user is admin
        user = service.create_user_by_admin(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    data: schema.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Demande de réinitialisation de mot de passe.

    1. Persiste la notification en base de données (survit aux reconnexions).
    2. Broadcast WebSocket pour les admins déjà connectés (temps réel).
    Retourne toujours 200 (anti-énumération d'emails).
    """
    user = service.get_user_by_email(db, data.email)
    if user and user.is_active:
        ts = datetime.utcnow().isoformat()
        payload = {
            "user_id":     user.id,
            "user_nom":    user.nom,
            "user_prenom": user.prenom,
            "user_email":  user.email,
            "timestamp":   ts,
        }
        # 1. Persistence DB — notification visible même si l'admin n'était pas connecté
        service.create_notification(
            db,
            type="forgot_password_request",
            title=f"{user.prenom} {user.nom} — mot de passe oublié",
            target_role="admin",
            payload=payload,
        )
        # 2. Broadcast WS — livraison instantanée si l'admin est déjà connecté
        await maintenance_ws_manager.broadcast("forgot_password_request", {
            **payload,
            "message": f"{user.prenom} {user.nom} a oublié son mot de passe",
        })
        logger.info(f"Notification mot de passe oublié sauvegardée + broadcast pour {user.email}")
    return {"message": "Si cet email est enregistré, l'administrateur a été notifié."}


@router.get("/notifications", response_model=List[schema.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retourne les notifications non lues pour le rôle de l'utilisateur connecté."""
    role = current_user.get("role")
    return service.get_unread_notifications(db, role)


@router.post("/notifications/read", status_code=status.HTTP_200_OK)
def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Marque toutes les notifications comme lues pour le rôle de l'utilisateur connecté."""
    role = current_user.get("role")
    service.mark_all_notifications_read(db, role)
    return {"message": "Notifications marquées comme lues"}


@router.post("/login", response_model=schema.LoginResponse)
def login(data: schema.UserLogin, db: Session = Depends(get_db)):
    """
    Login endpoint.

    Returns force_change_password = True if user is on first login.
    Raises 403 if the account is inactive, 401 if credentials are invalid.
    """
    try:
        user = service.authenticate(db, data.email, data.password)
    except ValueError as e:
        if str(e) == "compte_inactif":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="compte_inactif",
            )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_token({
        "sub": user.email,
        "role": user.role,
        "user_id": user.id,
        "erp_access": user.erp_access,
        "apps": get_apps_for_user(user.erp_access),
    })
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
        "force_change_password": user.is_first_login
    }


@router.post("/change-password")
def change_password(
    change_data: schema.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Change password (first login or password reset).
    
    Called after user logs in with temporary password.
    Updates password and allows access to system.
    """
    try:
        user_id = current_user.get("user_id")
        
        user = service.change_password(db, user_id, change_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "message": "Password changed successfully",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to change password")


@router.get("/users", response_model=List[schema.UserResponse])
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """Get all users (admin only)."""
    # TODO: Verify current_user is admin
    return service.get_users(db, skip, limit)


@router.get("/users/stats", response_model=schema.UserStatsResponse)
def get_users_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """Get advanced user statistics for dashboard cards."""
    # TODO: Verify current_user is admin
    return service.get_user_stats(db)


@router.get("/users/{user_id}", response_model=schema.UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """Get user by ID (admin only)."""
    # TODO: Verify current_user is admin
    user = service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/users/{user_id}", response_model=schema.UserResponse)
def update_user(
    user_id: int,
    user_data: schema.UserUpdateByAdmin,
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """Update user by ID (admin only)."""
    try:
        user = service.update_user_by_admin(db, user_id, user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")


@router.post("/users/{user_id}/reset-password", status_code=status.HTTP_200_OK)
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """Reset user password and send a new temporary password by email (admin only)."""
    try:
        user = service.reset_user_password_by_admin(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return {
            "message": "Temporary password generated and sent by email",
            "user_id": user.id,
            "email": user.email,
            "is_first_login": user.is_first_login,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error resetting user password: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reset password")


@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(_require_admin)
):
    """Delete user (admin only)."""
    # TODO: Verify current_user is admin
    result = service.delete_user(db, user_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": "User deleted successfully", "user_id": user_id}