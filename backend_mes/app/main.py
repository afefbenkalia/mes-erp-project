from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine

# 🔹 Import des routers
from app.modules.production.router import router as production_router
from app.modules.orders.router import router as orders_router


# -----------------
# Création de l'application
# -----------------
app = FastAPI(
    title="MES ERP Backend",
    description="API Backend pour la gestion MES et ERP",
    version="2.0"
)

# -----------------
# CORS (autoriser React + Vite)
# -----------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------
# Création des tables
# -----------------
Base.metadata.create_all(bind=engine)

# -----------------
# Routers
# -----------------
app.include_router(orders_router)
app.include_router(production_router)

# -----------------
# Endpoint test
# -----------------
@app.get("/")
def root():
    return {"message": "Backend MES ERP fonctionne !"}