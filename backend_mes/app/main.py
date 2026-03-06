from fastapi import FastAPI
from app.core.database import Base, engine

from app.modules.machines.router import router as machines_router
from app.modules.machines import model 

app = FastAPI()

app.include_router(machines_router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def read_root():
    return {"message": "MES API running"}