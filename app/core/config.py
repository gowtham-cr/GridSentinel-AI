"""Application configuration settings."""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load .env file if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


class Settings:
    """Central settings class reading from environment variables with safe defaults."""

    # Application Information
    APP_NAME: str = os.getenv("APP_NAME", "GridSentinel AI")
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "t")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")

    # Security & Authentication
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "gridsentinel_development_secret_key_change_in_production_32bytes"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    CORS_ORIGINS: List[str] = ["*"]

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR.as_posix()}/gridsentinel.db")

    # Electrical Grid Simulation
    DEFAULT_GRID_TOPOLOGY: str = os.getenv("DEFAULT_GRID_TOPOLOGY", "ieee14_grid")
    POWER_FLOW_ALGORITHM: str = os.getenv("POWER_FLOW_ALGORITHM", "nr")  # nr: Newton-Raphson
    VOLTAGE_LOWER_LIMIT_PU: float = float(os.getenv("VOLTAGE_LOWER_LIMIT_PU", "0.90"))
    VOLTAGE_UPPER_LIMIT_PU: float = float(os.getenv("VOLTAGE_UPPER_LIMIT_PU", "1.10"))
    MAX_LINE_LOADING_PERCENT: float = float(os.getenv("MAX_LINE_LOADING_PERCENT", "100.0"))

    # Telemetry
    TELEMETRY_SAMPLE_RATE_HZ: float = float(os.getenv("TELEMETRY_SAMPLE_RATE_HZ", "2.0"))
    TELEMETRY_NOISE_STD_DEV: float = float(os.getenv("TELEMETRY_NOISE_STD_DEV", "0.002"))
    TELEMETRY_BUFFER_SIZE: int = int(os.getenv("TELEMETRY_BUFFER_SIZE", "500"))

    # Cybersecurity & AI Detection
    ML_MODEL_TYPE: str = os.getenv("ML_MODEL_TYPE", "isolation_forest")
    ANOMALY_CONTAMINATION_RATE: float = float(os.getenv("ANOMALY_CONTAMINATION_RATE", "0.05"))
    RESIDUAL_THRESHOLD_MW: float = float(os.getenv("RESIDUAL_THRESHOLD_MW", "2.0"))
    MODEL_STORAGE_DIR: str = os.getenv("MODEL_STORAGE_DIR", str(BASE_DIR / "models_data"))


settings = Settings()

