from fastapi import FastAPI
from app.modules.production.router import router as production_router
from app.database import init_db

app = FastAPI(
    title="MES-ERP Backend",
    version="1.0.0"
)

# Inclure le router production
app.include_router(production_router)

# Créer les tables automatiquement au démarrage
@app.on_event("startup")
def on_startup():
    init_db()