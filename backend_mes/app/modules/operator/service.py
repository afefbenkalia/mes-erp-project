from sqlalchemy.orm import Session
from app.modules.machines.service import change_state
from app.modules.maintenance.service import set_machine_error

from .model import OperatorAction
from .schema import OperatorActionCreate


def operator_change_state(db: Session, data: OperatorActionCreate):
    action = OperatorAction(
        machine_id=data.machine_id,
        action=data.action,
        comment=data.comment,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    if data.action == "ERREUR":
        set_machine_error(db, data.machine_id, changed_by="operator-api")
    else:
        change_state(db, data.machine_id, data.action, comment=data.comment, changed_by="operator-api")

    return action
