import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.ensure_schema import (
    ensure_initial_state_history_seeded,
    ensure_machine_data_table_dropped,
    ensure_machine_state_history_changed_by,
    ensure_machines_reference_not_unique,
    ensure_operator_actions_table_dropped,
    ensure_preventive_maintenance_columns,
    ensure_productions_of_id_column,
    ensure_users_hashed_password_column,
    ensure_users_activity_columns,
)
from app.database import Base, engine
# Routers (imports also register ORM models in Base.metadata before create_all)
from app.modules.auth.router import router as auth_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.machines.router import router as machine_router
from app.modules.maintenance.router import router as maintenance_router
from app.modules.orders.router import router as orders_router
from app.modules.production.router import router as production_router
from app.modules.reports.router import router as reports_router
from app.modules.telemetry.router import router as telemetry_router
from app.modules.traceability.router import router as traceability_router

print("DATABASE_URL =", settings.DATABASE_URL)

# ── DB schema bootstrap (runs synchronously before the server accepts requests)
Base.metadata.create_all(bind=engine)
ensure_users_hashed_password_column()
ensure_users_activity_columns()
ensure_productions_of_id_column()
ensure_preventive_maintenance_columns()
ensure_machines_reference_not_unique()
ensure_machine_state_history_changed_by()
ensure_machine_data_table_dropped()
ensure_operator_actions_table_dropped()
ensure_initial_state_history_seeded()


# ── Lifespan: async startup / shutdown ────────────────────────────────────────
@asynccontextmanager
async def lifespan(_: FastAPI):
    from app.integrations.mqtt_consumer import mqtt_consumer
    from app.integrations.runtime_cache import runtime_cache
    from app.modules.telemetry.aggregator import aggregation_loop
    from app.modules.telemetry.router import broadcast_telemetry

    # Seed runtime/downtime cache so the first WebSocket snapshot is meaningful
    await asyncio.to_thread(runtime_cache.refresh)

    # Start MQTT consumer (daemon thread, auto-reconnects)
    mqtt_consumer.start(asyncio.get_event_loop(), broadcast_telemetry)

    # Start 60-second aggregation + runtime-cache refresh background task
    task = asyncio.create_task(aggregation_loop())

    yield  # server is running

    task.cancel()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MES ERP Backend",
    description="API Backend pour la gestion MES et ERP",
    version="2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,        prefix="/auth")
app.include_router(orders_router,      prefix="/api")
app.include_router(production_router,  prefix="/api")
app.include_router(dashboard_router,   prefix="/api")
app.include_router(traceability_router, prefix="/api")
app.include_router(machine_router,     prefix="/api")
app.include_router(maintenance_router, prefix="/api")
app.include_router(telemetry_router,   prefix="/api")
app.include_router(reports_router,     prefix="/api")


# ── Utility routes ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Backend MES ERP fonctionne !"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/routes")
def list_routes():
    return [
        {"path": route.path, "methods": list(route.methods) if route.methods else []}
        for route in app.routes
    ]
