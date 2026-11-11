"""Database initialization script to create tables and verify SQLite connection."""

from app.core.logging import logger
from app.database.session import Base, engine


def init_db() -> None:
    """Create all SQLite tables according to declarative models."""
    try:
        logger.info("Initializing SQLite database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("SQLite database schema initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite database: {e}")
        raise


if __name__ == "__main__":
    init_db()

