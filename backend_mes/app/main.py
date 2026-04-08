from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.core.ensure_schema import ensure_users_hashed_password_column

# Import des routers
from app.modules.production.router import router as production_router
from app.modules.orders.router import router as orders_router
from app.modules.traceability.router import router as traceability_router
from app.modules.machines.router import router as machine_router
from app.modules.auth.router import router as auth_router

app = FastAPI(
    title="MES ERP Backend",
    description="API Backend pour la gestion MES et ERP",
    version="2.0"
)

# CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Création des tables
Base.metadata.create_all(bind=engine)
ensure_users_hashed_password_column()

# Routers - IMPORTANT: Le préfixe est "/auth" une seule fois
app.include_router(auth_router, prefix="/auth")
app.include_router(orders_router, prefix="/api")
app.include_router(production_router, prefix="/api")
app.include_router(traceability_router, prefix="/api")
app.include_router(machine_router, prefix="/api")
@app.get("/")
def root():
    return {"message": "Backend MES ERP fonctionne !"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Route pour debug - voir toutes les routes
@app.get("/routes")
def list_routes():
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "methods": list(route.methods) if route.methods else []
        })
    return {"routes": routes}