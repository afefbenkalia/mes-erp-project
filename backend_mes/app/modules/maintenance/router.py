"""Routes for maintenance dashboard."""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.datetime_utc import utc_now_naive
from app.database import get_db
from app.modules.auth.model import User
from app.utils.email_service import send_maintenance_notification_email

from .realtime import maintenance_ws_manager
from .schema import (
    HandleErrorRequest,
    InterventionResponse,
    MaintenanceHistoryResponse,
    MachineStatusResponse,
    MarkRepairedRequest,
    PreventiveMaintenanceCreate,
    PreventiveMaintenanceUpdate,
    PreventiveMaintenanceResponse,
    SimulationErrorRequest,
)
from .service import (
    check_and_trigger_due_preventive_maintenance,
    create_preventive_maintenance,
    delete_preventive_maintenance,
    list_history,
    list_machine_statuses,
    list_open_interventions,
    list_preventive_maintenance,
    mark_machine_repaired,
    set_machine_error,
    set_machine_error_by_reference,
    take_over_machine,
    update_preventive_maintenance,
)

router = APIRouter(prefix="/maintenance", tags=["maintenance"])
logger = logging.getLogger(__name__)


async def _email_maintenance_users(db: Session, payload: dict) -> None:
    recipients = (
        db.query(User.email)
        .filter(User.role == "maintenance", User.is_active.is_(True))
        .all()
    )
    emails = [email for (email,) in recipients if email]
    if not emails:
        logger.warning("No active maintenance users found for error notification email")
        return

    await asyncio.gather(
        *[
            asyncio.to_thread(send_maintenance_notification_email, email, payload)
            for email in emails
        ]
    )


async def _broadcast_preventive_due_events(db: Session, events: list[dict]) -> None:
    for event in events:
        notification_payload = {
            "message": event["message"],
            "machine_id": event["machine_id"],
            "machine_reference": event["machine_reference"],
            "state": event["state"],
            "preventive_id": event["preventive_id"],
            "trigger_mode": event["trigger_mode"],
            "intervention_created": event["intervention_created"],
        }
        await maintenance_ws_manager.broadcast("notification", notification_payload)
        await _email_maintenance_users(db, notification_payload)
        await maintenance_ws_manager.broadcast(
            "machine_update",
            {
                "machine_id": event["machine_id"],
                "machine_reference": event["machine_reference"],
                "machine_name": event["machine_name"],
                "state": event["state"],
                "last_update": str(utc_now_naive()),
            },
        )


@router.websocket("/ws")
async def maintenance_ws(websocket: WebSocket):
    await maintenance_ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        maintenance_ws_manager.disconnect(websocket)
    except Exception:
        maintenance_ws_manager.disconnect(websocket)


@router.get("/machines", response_model=list[MachineStatusResponse])
async def get_machine_statuses(db: Session = Depends(get_db)):
    due_events = check_and_trigger_due_preventive_maintenance(db)
    if due_events:
        await _broadcast_preventive_due_events(db, due_events)
    rows = list_machine_statuses(db)
    return [
        MachineStatusResponse(
            machine_id=machine.id,
            machine_reference=machine.reference,
            machine_name=machine.name,
            state=status.state,
            last_update=status.last_update,
        )
        for machine, status in rows
    ]


@router.get("/interventions", response_model=list[InterventionResponse])
async def get_open_interventions(db: Session = Depends(get_db)):
    due_events = check_and_trigger_due_preventive_maintenance(db)
    if due_events:
        await _broadcast_preventive_due_events(db, due_events)
    return list_open_interventions(db)


@router.get("/history", response_model=list[MaintenanceHistoryResponse])
async def get_maintenance_history(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    due_events = check_and_trigger_due_preventive_maintenance(db)
    if due_events:
        await _broadcast_preventive_due_events(db, due_events)
    return list_history(db, limit=limit)


@router.post("/machines/{machine_id}/simulate-error", response_model=MachineStatusResponse)
async def simulate_error(machine_id: int, db: Session = Depends(get_db)):
    try:
        machine, status, entered_error = set_machine_error(db, machine_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if entered_error:
        payload = {
            "message": f"Machine {machine.reference} en ERREUR",
            "machine_id": machine.id,
            "machine_reference": machine.reference,
            "state": status.state,
        }
        await maintenance_ws_manager.broadcast("notification", payload)
        await _email_maintenance_users(db, payload)
    await maintenance_ws_manager.broadcast(
        "machine_update",
        {
            "machine_id": machine.id,
            "machine_reference": machine.reference,
            "machine_name": machine.name,
            "state": status.state,
            "last_update": str(status.last_update),
        },
    )

    return MachineStatusResponse(
        machine_id=machine.id,
        machine_reference=machine.reference,
        machine_name=machine.name,
        state=status.state,
        last_update=status.last_update,
    )


@router.post("/simulation/error", response_model=MachineStatusResponse)
async def simulation_error_event(data: SimulationErrorRequest, db: Session = Depends(get_db)):
    if data.machine_id is not None:
        return await simulate_error(data.machine_id, db)

    if data.machine_reference:
        try:
            machine, status, entered_error = set_machine_error_by_reference(
                db, data.machine_reference
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        if entered_error:
            payload = {
                "message": f"Machine {machine.reference} en ERREUR",
                "machine_id": machine.id,
                "machine_reference": machine.reference,
                "state": status.state,
            }
            await maintenance_ws_manager.broadcast("notification", payload)
            await _email_maintenance_users(db, payload)
        await maintenance_ws_manager.broadcast(
            "machine_update",
            {
                "machine_id": machine.id,
                "machine_reference": machine.reference,
                "machine_name": machine.name,
                "state": status.state,
                "last_update": str(status.last_update),
            },
        )
        return MachineStatusResponse(
            machine_id=machine.id,
            machine_reference=machine.reference,
            machine_name=machine.name,
            state=status.state,
            last_update=status.last_update,
        )

    raise HTTPException(status_code=400, detail="machine_id ou machine_reference requis")


@router.post("/machines/{machine_id}/take-over", response_model=InterventionResponse)
async def take_over(machine_id: int, data: HandleErrorRequest, db: Session = Depends(get_db)):
    try:
        machine, status, intervention = take_over_machine(db, machine_id, data.technician)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await maintenance_ws_manager.broadcast(
        "machine_update",
        {
            "machine_id": machine.id,
            "machine_reference": machine.reference,
            "machine_name": machine.name,
            "state": status.state,
            "last_update": str(status.last_update),
        },
    )
    await maintenance_ws_manager.broadcast(
        "notification",
        {
            "message": f"Machine {machine.reference} prise en charge",
            "machine_id": machine.id,
        },
    )
    return InterventionResponse.model_validate(intervention)


@router.post("/machines/{machine_id}/mark-repaired", response_model=InterventionResponse)
async def mark_repaired(machine_id: int, data: MarkRepairedRequest, db: Session = Depends(get_db)):
    try:
        machine, status, intervention, history = mark_machine_repaired(
            db,
            machine_id,
            data.technician,
            data.action_effectuee,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await maintenance_ws_manager.broadcast(
        "intervention_completed",
        {
            "intervention_id": intervention.id,
            "machine_id": machine.id,
            "machine_reference": machine.reference,
            "action_effectuee": history.action_effectuee,
            "duration_seconds": history.duration_seconds,
            "technician": history.technician,
            "date": str(history.date),
        },
    )
    await maintenance_ws_manager.broadcast(
        "machine_update",
        {
            "machine_id": machine.id,
            "machine_reference": machine.reference,
            "machine_name": machine.name,
            "state": status.state,
            "last_update": str(status.last_update),
        },
    )
    return InterventionResponse.model_validate(intervention)


@router.get("/preventive", response_model=list[PreventiveMaintenanceResponse])
async def get_preventive_maintenance(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    due_events = check_and_trigger_due_preventive_maintenance(db)
    if due_events:
        await _broadcast_preventive_due_events(db, due_events)
    return list_preventive_maintenance(db, limit=limit)


@router.post("/preventive", response_model=PreventiveMaintenanceResponse, status_code=201)
def add_preventive_maintenance(data: PreventiveMaintenanceCreate, db: Session = Depends(get_db)):
    try:
        return create_preventive_maintenance(
            db,
            machine_id=data.machine_id,
            planned_date=data.planned_date,
            maintenance_type=data.maintenance_type,
            status=data.status,
            trigger_mode=data.trigger_mode,
            runtime_threshold_minutes=data.runtime_threshold_minutes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/preventive/{preventive_id}", response_model=PreventiveMaintenanceResponse)
def edit_preventive_maintenance(
    preventive_id: int,
    data: PreventiveMaintenanceUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_preventive_maintenance(
            db,
            preventive_id=preventive_id,
            planned_date=data.planned_date,
            maintenance_type=data.maintenance_type,
            trigger_mode=data.trigger_mode,
            runtime_threshold_minutes=data.runtime_threshold_minutes,
            status=data.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/preventive/{preventive_id}", status_code=204)
def remove_preventive_maintenance(preventive_id: int, db: Session = Depends(get_db)):
    try:
        delete_preventive_maintenance(db, preventive_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
