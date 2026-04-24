import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # =====================
    # DATABASE (PostgreSQL)
    # =====================
    DATABASE_URL: str = os.getenv("DATABASE_URL")

    # =====================
    # SECURITY / JWT
    # =====================
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # =====================
    # SMTP EMAIL
    # =====================
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "True").lower() in (
        "true",
        "1",
        "yes",
    )
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")

    # =====================
    # FRONTEND
    # =====================
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # =====================
    # SERVICES (MICROSERVICES)
    # =====================
    MES_BASE_URL: str = os.getenv("MES_BASE_URL", "http://localhost:8000")
    ERP_BASE_URL: str = os.getenv("ERP_BASE_URL", "http://localhost:8001")


settings = Settings()