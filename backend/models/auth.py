from pydantic import BaseModel
from typing import Optional


class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    national_id: str
    phone: Optional[str] = None
    applicant_type: str = "citizen"
    city: Optional[str] = None
    zone_id: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
