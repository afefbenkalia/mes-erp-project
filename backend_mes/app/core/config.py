"""Configuration de l'application."""

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:afef2003@localhost:5432/mes_db",
)
