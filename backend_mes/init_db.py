from app.database import Base, engine
from app.modules.auth.model import User  # important !
from app.modules.machines.model import Machine, MachineType
print("Création des tables...")

Base.metadata.create_all(bind=engine)

print("OK - tables créées")