import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from .model import User, Notification
from .schema import UserCreateByAdmin, UserUpdateByAdmin, ChangePasswordRequest
from app.core.security import (
    hash_password,
    verify_password,
    generate_temporary_password,
)
from app.utils.email_service import send_welcome_email, send_password_reset_email


logger = logging.getLogger("auth_service")


def normalize_email(email: str) -> str:
    """Normalize email to lowercase and strip whitespace."""
    return email.strip().lower()


def get_user_by_email(db: Session, email: str):
    """Get user by email (case-insensitive)."""
    return db.query(User).filter(func.lower(User.email) == normalize_email(email)).first()


def get_user_by_id(db: Session, user_id: int):
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_cin(db: Session, cin: str):
    """Get user by CIN."""
    return db.query(User).filter(User.cin == cin).first()


def get_active_operators(db: Session):
    """Return all active users with role 'operator'."""
    return (
        db.query(User)
        .filter(User.role == "operator", User.is_active == True)
        .order_by(User.nom, User.prenom)
        .all()
    )


def create_user_by_admin(db: Session, user_data: UserCreateByAdmin) -> User:
    """
    Admin creates a new user with temporary password.
    
    Flow:
    1. Check if email/cin already exists
    2. Generate temporary password
    3. Hash password
    4. Create user with is_first_login = True
    5. Send welcome email (async if BackgroundTasks available)
    
    Args:
        db: Database session
        user_data: User creation data (cin, nom, prenom, email, role)
    
    Returns:
        Created user object
    
    Raises:
        ValueError: If email or CIN already exists
    """
    # Check if email already exists
    existing_email = get_user_by_email(db, user_data.email)
    if existing_email:
        raise ValueError("Email already exists")
    
    # Check if CIN already exists
    existing_cin = get_user_by_cin(db, user_data.cin)
    if existing_cin:
        raise ValueError("CIN already exists")
    
    # Generate temporary password
    temp_password = generate_temporary_password()
    
    # erp_access only valid for managers
    erp_access = user_data.erp_access if user_data.role == "manager" else False

    # Create new user
    db_user = User(
        cin=user_data.cin.strip(),
        nom=user_data.nom.strip(),
        prenom=user_data.prenom.strip(),
        email=normalize_email(user_data.email),
        hashed_password=hash_password(temp_password),
        role=user_data.role,
        erp_access=erp_access,
        is_active=True,
        is_first_login=True,
        created_at=datetime.utcnow()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Send welcome email with temporary password
    try:
        send_welcome_email(
            email=db_user.email,
            temporary_password=temp_password,
            nom=db_user.nom,
            prenom=db_user.prenom
        )
        logger.info(f"Welcome email sent to {db_user.email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {db_user.email}: {e}")
        # Don't fail the user creation if email fails
    
    return db_user


def authenticate(db: Session, email: str, password: str) -> User | None:
    """
    Authenticate user with email and password.
    
    Args:
        db: Database session
        email: User email
        password: Plain password
    
    Returns:
        User object if authentication successful, None otherwise
    """
    user = get_user_by_email(db, email)
    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    if not user.is_active:
        raise ValueError("compte_inactif")
    
    # Update login activity metrics
    now = datetime.utcnow()
    user.last_login = now
    user.last_access = now
    user.login_count = (user.login_count or 0) + 1
    db.commit()
    db.refresh(user)
    
    return user


def change_password(db: Session, user_id: int, change_data: ChangePasswordRequest) -> User | None:
    """
    Change user password (called after first login).
    
    Flow:
    1. Get user by ID
    2. Verify current password is correct
    3. Hash and update new password
    4. Set is_first_login = False
    5. Return updated user
    
    Args:
        db: Database session
        user_id: User ID
        change_data: ChangePasswordRequest with current and new password
    
    Returns:
        Updated user object or None if user not found
    
    Raises:
        ValueError: If current password is incorrect
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    # Verify current password
    if not verify_password(change_data.current_password, user.hashed_password):
        raise ValueError("Current password is incorrect")
    
    # Update password and reset first login flag
    user.hashed_password = hash_password(change_data.new_password)
    user.is_first_login = False
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"Password changed for user {user.email}")
    return user


def get_users(db: Session, skip: int = 0, limit: int = 100):
    """Get paginated list of users."""
    return db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()


def get_all_users(db: Session):
    """Get all users."""
    return db.query(User).order_by(User.created_at.desc()).all()


def delete_user(db: Session, user_id: int):
    """Delete user by ID."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    db.delete(user)
    db.commit()
    logger.info(f"User {user.email} deleted")
    return True


def get_users_count(db: Session):
    return db.query(User).count()


def update_user_by_admin(db: Session, user_id: int, user_data: UserUpdateByAdmin) -> User | None:
    """Update a user profile by ID (admin action)."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    normalized_email = normalize_email(user_data.email)
    normalized_cin = user_data.cin.strip()

    existing_email = get_user_by_email(db, normalized_email)
    if existing_email and existing_email.id != user_id:
        raise ValueError("Email already exists")

    existing_cin = get_user_by_cin(db, normalized_cin)
    if existing_cin and existing_cin.id != user_id:
        raise ValueError("CIN already exists")

    user.cin = normalized_cin
    user.nom = user_data.nom.strip()
    user.prenom = user_data.prenom.strip()
    user.email = normalized_email
    user.role = user_data.role
    user.is_active = user_data.is_active
    # erp_access only valid for managers — reset if role changed
    user.erp_access = user_data.erp_access if user_data.role == "manager" else False

    db.commit()
    db.refresh(user)
    logger.info(f"User {user.email} updated")
    return user


def reset_user_password_by_admin(db: Session, user_id: int) -> User | None:
    """Reset user password to a new temporary value and force password change on next login."""
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    temporary_password = generate_temporary_password()

    user.hashed_password = hash_password(temporary_password)
    user.is_first_login = True

    try:
        email_sent = send_password_reset_email(
            email=user.email,
            temporary_password=temporary_password,
            nom=user.nom,
            prenom=user.prenom,
        )
        if not email_sent:
            db.rollback()
            raise ValueError("Failed to send password reset email")

        db.commit()
        db.refresh(user)
        logger.info(f"Temporary password reset for user {user.email}")
        return user
    except Exception:
        db.rollback()
        raise


def create_notification(
    db: Session,
    type: str,
    title: str,
    target_role: str,
    payload: dict = None,
) -> Notification:
    notif = Notification(
        type=type,
        title=title,
        target_role=target_role,
        payload=payload,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    logger.info(f"Notification created: type={type} target_role={target_role}")
    return notif


# Variantes d'un même métier qui partagent la même file de notifications.
# Un opérateur peut avoir le rôle "operator" ou "operateur" selon les comptes ;
# une notification ciblant "operateur" doit donc être visible par les deux.
_ROLE_ALIASES = {
    "operator": ["operator", "operateur"],
    "operateur": ["operator", "operateur"],
    "maintenance": ["maintenance", "responsable_maintenance"],
    "responsable_maintenance": ["maintenance", "responsable_maintenance"],
}


def target_roles_for(role: str) -> list:
    """Renvoie l'ensemble des target_role qu'un utilisateur de ce rôle doit voir."""
    if not role:
        return []
    return _ROLE_ALIASES.get(role.lower(), [role])


def get_unread_notifications(db: Session, target_role: str) -> list:
    roles = target_roles_for(target_role)
    if not roles:
        return []
    return (
        db.query(Notification)
        .filter(Notification.target_role.in_(roles), Notification.is_read == False)  # noqa: E712
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


def mark_all_notifications_read(db: Session, target_role: str) -> None:
    roles = target_roles_for(target_role)
    if not roles:
        return
    db.query(Notification).filter(
        Notification.target_role.in_(roles),
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    logger.info(f"Notifications marked as read for role={target_role}")


def get_user_stats(db: Session) -> dict:
    """Return aggregated user statistics for admin dashboard."""
    now = datetime.utcnow()
    current_month_start = datetime(now.year, now.month, 1)

    if now.month == 1:
        prev_month_start = datetime(now.year - 1, 12, 1)
    else:
        prev_month_start = datetime(now.year, now.month - 1, 1)

    total = db.query(User).count()
    active = db.query(User).filter(User.is_active.is_(True)).count()
    inactive = total - active

    created_this_month = (
        db.query(User)
        .filter(User.created_at >= current_month_start)
        .count()
    )

    created_prev_month = (
        db.query(User)
        .filter(User.created_at >= prev_month_start, User.created_at < current_month_start)
        .count()
    )

    if created_prev_month == 0:
        growth_percentage = 100.0 if created_this_month > 0 else 0.0
    else:
        growth_percentage = ((created_this_month - created_prev_month) / created_prev_month) * 100

    role_rows = (
        db.query(User.role, func.count(User.id))
        .group_by(User.role)
        .all()
    )

    per_role = [
        {"role": (role or "operator"), "count": count}
        for role, count in role_rows
    ]

    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "created_this_month": created_this_month,
        "growth_percentage": round(growth_percentage, 2),
        "per_role": per_role,
    }