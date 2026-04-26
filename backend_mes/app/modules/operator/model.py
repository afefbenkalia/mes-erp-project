from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.datetime_utc import utc_now_naive
from app.database import Base


class OperatorAction(Base):
    __tablename__ = "operator_actions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"))
    action = Column(String(20), nullable=False)  # MARCHE / PAUSE / ERREUR
    comment = Column(String(255))
    created_at = Column(DateTime, default=utc_now_naive)

    machine = relationship("Machine")