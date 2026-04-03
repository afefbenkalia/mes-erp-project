from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.modules.production.router import router as production_router
from app.modules.production import model

app = FastAPI(title="MES-ERP", version="1.0")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# IMPORTANT : pas de prefix ici
app.include_router(production_router)

@app.get("/")
def home():
    return {"message": "MES-ERP API running"}