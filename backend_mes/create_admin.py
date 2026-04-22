import os
import sys

from sqlalchemy import or_

# Ajouter le chemin du projet
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import hash_password
from app.database import SessionLocal
from app.modules.auth.model import User


ADMIN_CIN = "ADMIN001"
ADMIN_NOM = "System"
ADMIN_PRENOM = "Admin"
ADMIN_EMAIL = "admin@erp-system.fr"
ADMIN_PASSWORD = "admin123"


def create_admin():
    db = SessionLocal()

    try:
        existing_admin = (
            db.query(User)
            .filter(or_(User.email == ADMIN_EMAIL, User.cin == ADMIN_CIN))
            .first()
        )

        if existing_admin:
            print("Admin deja existant, suppression...")
            db.delete(existing_admin)
            db.commit()

        admin = User(
            cin=ADMIN_CIN,
            nom=ADMIN_NOM,
            prenom=ADMIN_PRENOM,
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            role="admin",
            is_active=True,
            is_first_login=False,
        )

        db.add(admin)
        db.commit()

        print("\nADMIN CREE AVEC SUCCES")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Mot de passe: {ADMIN_PASSWORD}")
        print("Role: admin")

    except Exception as exc:
        db.rollback()
        print(f"Erreur: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Creation de l'administrateur...")
    create_admin()