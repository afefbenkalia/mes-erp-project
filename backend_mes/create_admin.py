# create_admin.py
import sys
import os

# Ajouter le chemin du projet
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.modules.auth.model import User
from app.core.security import hash_password
from datetime import datetime

def create_admin():
    db = SessionLocal()
    
    try:
        # Supprimer l'ancien admin s'il existe
        old_admin = db.query(User).filter(User.email == "admin@erp-system.fr").first()
        if old_admin:
            print("📧 Ancien admin trouvé, suppression...")
            db.delete(old_admin)
            db.commit()
        
        # Créer le nouvel admin
        hashed_pwd = hash_password("admin123")
        print(f"🔑 Hash généré: {hashed_pwd}")
        
        admin = User(
            name="Administrateur",
            email="admin@erp-system.fr",
            hashed_password=hashed_pwd,
            role="admin",
            status="active",
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.add(admin)
        db.commit()
        
        print("\n✅ ADMIN CRÉÉ AVEC SUCCÈS !")
        print("📧 Email: admin@erp-system.fr")
        print("🔐 Mot de passe: admin123")
        print("👤 Rôle: admin")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Création de l'administrateur...")
    create_admin()