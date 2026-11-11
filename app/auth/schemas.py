"""Pydantic schemas for authentication and authorization."""

from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Payload for operator login."""
    username: Optional[str] = None
    username_or_email: Optional[str] = None
    password: str = Field(..., description="Access passcode")
    remember_me: bool = Field(True, description="Extend session duration")

    @property
    def identifier(self) -> str:
        return (self.username_or_email or self.username or "").strip()


class OperatorUser(BaseModel):
    """Operator user profile and credentials."""
    id: str
    username: str
    email: str
    operator_name: str
    role: str
    clearance_level: str
    node_id: str
    is_active: bool = True


class Token(BaseModel):
    """OAuth2 / JWT access token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: Optional[int] = Field(3600, description="Token validity in seconds")
    user: Optional[OperatorUser] = None


class VerifyTokenResponse(BaseModel):
    """Verification result for token inspection."""
    valid: bool
    operator: Optional[OperatorUser] = None
    clearance_level: Optional[str] = None
    message: str

