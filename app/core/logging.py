"""Logging configuration for GridSentinel AI."""

import logging
import sys
from app.core.config import settings


def setup_logging() -> logging.Logger:
    """Configure system-wide standard logging."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] - %(message)s"
    )

    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
        force=True,
    )

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("pandapower").setLevel(logging.WARNING)

    logger = logging.getLogger("gridsentinel")
    logger.setLevel(log_level)
    return logger


logger = setup_logging()

