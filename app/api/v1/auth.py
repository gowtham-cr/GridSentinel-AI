"""Authentication REST API endpoints."""

from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import jwt

from app.auth.schemas import (
    Token,
    LoginRequest,
    OperatorUser,
    VerifyTokenResponse,
)
from app.auth.security import create_access_token, decode_access_token
from app.auth.service import authenticate_operator, get_operator_by_identifier
from app.core.config import settings
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/token",
    auto_error=False,
)


def get_current_operator(
    token: Optional[str] = Depends(oauth2_scheme),
) -> OperatorUser:
    """
    FastAPI dependency validating Bearer JWT and returning current OperatorUser.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing Bearer access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload. Subject claim missing.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        operator = get_operator_by_identifier(username)
        if not operator:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Operator account no longer active or recognized.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return operator
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid cryptographic signature: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
def login_operator(request: LoginRequest):
    """
    Direct JSON login endpoint for GridSentinel UI.
    Validates operator credentials and returns a signed JWT access token.
    """
    operator = authenticate_operator(request.identifier, request.password)
    if not operator:
        logger.warning(f"Failed login attempt for operator identifier: '{request.identifier}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ACCESS DENIED: Invalid operator identifier or security passcode.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Calculate token expiration
    expire_minutes = (
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 7
        if request.remember_me
        else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    expires_delta = timedelta(minutes=expire_minutes)

    token_claims = {
        "sub": operator.username,
        "email": operator.email,
        "operator_name": operator.operator_name,
        "role": operator.role,
        "clearance_level": operator.clearance_level,
        "node_id": operator.node_id,
    }

    access_token = create_access_token(token_claims, expires_delta=expires_delta)
    logger.info(f"Operator '{operator.operator_name}' successfully authenticated ({operator.clearance_level})")

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=int(expires_delta.total_seconds()),
        user=operator,
    )


@router.post("/token", response_model=Token)
def login_oauth2(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password grant endpoint for Swagger UI and API clients.
    """
    operator = authenticate_operator(form_data.username, form_data.password)
    if not operator:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_claims = {
        "sub": operator.username,
        "email": operator.email,
        "operator_name": operator.operator_name,
        "role": operator.role,
        "clearance_level": operator.clearance_level,
        "node_id": operator.node_id,
    }

    access_token = create_access_token(token_claims, expires_delta=expires_delta)
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=int(expires_delta.total_seconds()),
        user=operator,
    )


@router.get("/me", response_model=OperatorUser)
def get_current_user_profile(operator: OperatorUser = Depends(get_current_operator)):
    """
    Returns profile and clearance details of the currently authenticated operator.
    """
    return operator


@router.post("/verify", response_model=VerifyTokenResponse)
def verify_token_payload(
    token_data: Optional[Token] = Body(None),
    token: Optional[str] = Query(None),
):
    """
    Validates token cryptographic signature and active status without requiring headers.
    Supports either JSON body (Token schema) or query param ?token=...
    """
    raw_token = (token_data.access_token if token_data else None) or token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing access token in request body or query parameter.",
        )
    try:
        payload = decode_access_token(raw_token)
        username = payload.get("sub")
        operator = get_operator_by_identifier(username) if username else None
        if not operator:
            return VerifyTokenResponse(
                valid=False,
                message="Subject in token not found in operator registry.",
            )
        return VerifyTokenResponse(
            valid=True,
            operator=operator,
            clearance_level=operator.clearance_level,
            message="Token cryptographic signature valid and active.",
        )
    except jwt.ExpiredSignatureError:
        return VerifyTokenResponse(
            valid=False,
            message="Token signature has expired.",
        )
    except jwt.PyJWTError as exc:
        return VerifyTokenResponse(
            valid=False,
            message=f"Cryptographic verification failed: {exc}",
        )

