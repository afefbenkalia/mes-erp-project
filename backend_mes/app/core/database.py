"""Configuration base de données PostgreSQL et session SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager

try:
    from app.core.config import DATABASE_URL
except ImportError:
    DATABASE_URL = "postgresql://postgres:afef2003@localhost:5432/mes_db"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False,  # Mettre True pour debug SQL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Générateur de session pour dépendance FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Context manager pour utilisation hors FastAPI."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
