"""Custom exceptions and error handlers for GridSentinel AI."""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.core.logging import logger


class GridSentinelException(Exception):
    """Base exception class for all GridSentinel AI application errors."""

    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR, details: dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class GridSimulationError(GridSentinelException):
    """Raised when pandapower simulation or power flow calculation fails."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class AttackExecutionError(GridSentinelException):
    """Raised when an attack scenario fails to validate or execute."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class DetectionModelError(GridSentinelException):
    """Raised when AI/ML feature extraction or detection fails."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
        )


class TelemetryError(GridSentinelException):
    """Raised when telemetry processing or sensor reading fails."""

    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


async def gridsentinel_exception_handler(request: Request, exc: GridSentinelException) -> JSONResponse:
    """Handle domain-specific GridSentinel exceptions cleanly."""
    logger.error(
        f"Domain exception on {request.method} {request.url.path}: {exc.message} | Details: {exc.details}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error_type": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details,
            "path": str(request.url.path),
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled internal server exceptions."""
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "error_type": "InternalServerError",
            "message": "An unexpected error occurred in GridSentinel platform.",
            "details": {"error": str(exc)},
            "path": str(request.url.path),
        },
    )

