"""Authentication service managing legitimate operator credentials and validation."""

from typing import Optional, Dict
from app.auth.schemas import OperatorUser
from app.auth.security import hash_password, verify_password

# Salted pre-computed PBKDF2 hashes for authorized operators
# (Passwords can also be updated or extended via database)
_STATIC_SALT = bytes.fromhex("1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d")

_OPERATORS_DB: Dict[str, Dict] = {
    "gowtham@gridsentinel.ai": {
        "id": "GS-OP-7749",
        "username": "gowtham",
        "email": "gowtham@gridsentinel.ai",
        "operator_name": "Commander Gowtham",
        "role": "Chief Grid Cyber Defense Officer",
        "clearance_level": "Level 4 (SCADA Critical Interconnect)",
        "node_id": "SENTINEL-ALPHA-07",
        "hashed_password": hash_password("Sentinel@2026", _STATIC_SALT),
        "is_active": True,
    },
    "admin": {
        "id": "GS-ADM-0001",
        "username": "admin",
        "email": "admin@gridsentinel.ai",
        "operator_name": "System Administrator",
        "role": "Chief Platform Security Engineer",
        "clearance_level": "Level 5 (Full SCADA & Dispatch Override)",
        "node_id": "SENTINEL-CORE-01",
        "hashed_password": hash_password("Admin@Sentinel2026", _STATIC_SALT),
        "is_active": True,
    },
    "operator": {
        "id": "GS-OP-0112",
        "username": "operator",
        "email": "operator@gridsentinel.ai",
        "operator_name": "Substation Security Analyst",
        "role": "SOC Operator",
        "clearance_level": "Level 2 (Telemetry Monitoring & Triage)",
        "node_id": "SUBSTATION-SEC-02",
        "hashed_password": hash_password("Operator@2026", _STATIC_SALT),
        "is_active": True,
    },
}


def get_operator_by_identifier(identifier: str) -> Optional[OperatorUser]:
    """Finds an operator by callsign username or email."""
    ident_lower = identifier.strip().lower()
    for user_key, data in _OPERATORS_DB.items():
        if (
            user_key.lower() == ident_lower
            or data["username"].lower() == ident_lower
            or data["email"].lower() == ident_lower
        ):
            return OperatorUser(
                id=data["id"],
                username=data["username"],
                email=data["email"],
                operator_name=data["operator_name"],
                role=data["role"],
                clearance_level=data["clearance_level"],
                node_id=data["node_id"],
                is_active=data["is_active"],
            )
    return None


def authenticate_operator(identifier: str, password: str) -> Optional[OperatorUser]:
    """
    Verifies credentials using constant-time PBKDF2 hash verification.
    Returns OperatorUser if authenticated, None otherwise.
    """
    ident_lower = identifier.strip().lower()
    for user_key, data in _OPERATORS_DB.items():
        if (
            user_key.lower() == ident_lower
            or data["username"].lower() == ident_lower
            or data["email"].lower() == ident_lower
        ):
            if not data.get("is_active", True):
                return None
            if verify_password(password, data["hashed_password"]):
                return OperatorUser(
                    id=data["id"],
                    username=data["username"],
                    email=data["email"],
                    operator_name=data["operator_name"],
                    role=data["role"],
                    clearance_level=data["clearance_level"],
                    node_id=data["node_id"],
                    is_active=data["is_active"],
                )
    return None

