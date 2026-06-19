from pydantic import BaseModel
from typing import Optional


class ApplicantType:
    citizen = "citizen"
    lawyer = "lawyer"
    company = "company"
    surveyor = "surveyor"
    authorized_representative = "authorized_representative"


class VerificationState:
    unverified = "unverified"
    verified = "verified"
    suspended = "suspended"


# Full model implemented by Module 2
class ApplicantCreate(BaseModel):
    full_name: str
    applicant_type: str = "citizen"
    national_id: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    zone_id: Optional[str] = None
    preferred_language: str = "en"
