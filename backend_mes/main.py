"""Point d'entrée FastAPI pour le backend MES."""

from fastapi import FastAPI

from app.core.database import engine, Base
from app.modules.machines.router import router as machines_router

# Import des modèles pour que Base les enregistre
from app.modules.machines import model as machines_model  # noqa: F401

app = FastAPI(
    title="MES / ERP Backend",
    description="Backend pour la gestion manufacturière (MES) et ERP",
    version="1.0.0",
)

# Enregistrement des routes
app.include_router(machines_router, prefix="/api")


@app.get("/")
def root():
    """Point d'entrée API."""
    return {"message": "MES/ERP API", "docs": "/docs"}


def init_db():
    """Crée toutes les tables (alternative au script SQL)."""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    import uvicorn
    init_db()  # Optionnel : créer les tables au démarrage
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
