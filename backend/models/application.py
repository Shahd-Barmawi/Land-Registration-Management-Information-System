from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class ApplicationType(str, Enum):
    first_registration = "first_registration"
    ownership_transfer = "ownership_transfer"
    parcel_subdivision = "parcel_subdivision"
    parcel_merge = "parcel_merge"
    boundary_correction = "boundary_correction"
    certificate_request = "certificate_request"


class ApplicationStatus(str, Enum):
    submitted = "submitted"
    pre_checked = "pre_checked"
    survey_required = "survey_required"
    surveyed = "surveyed"
    legal_review = "legal_review"
    approved = "approved"
    certificate_issued = "certificate_issued"
    closed = "closed"
    rejected = "rejected"
    on_hold = "on_hold"
    missing_documents = "missing_documents"
    under_objection = "under_objection"


class Priority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class ApplicantRef(BaseModel):
    applicant_id: str
    applicant_type: str = "citizen"
    submitted_by_representative: bool = False


class ParcelRef(BaseModel):
    parcel_id: Optional[str] = None
    parcel_number: str
    block_number: str
    basin_number: str
    zone_id: str


class RequiredDocument(BaseModel):
    document_type: str
    required: bool = True
    status: str = "pending"  # pending | pending_review | verified | rejected | missing
    file_id: Optional[str] = None
    filename: Optional[str] = None
    content_type: Optional[str] = None
    uploaded_at: Optional[str] = None


class ApplicationCreate(BaseModel):
    application_type: ApplicationType
    priority: Priority = Priority.normal
    applicant_ref: ApplicantRef
    parcel_ref: ParcelRef
    description: Optional[str] = None
    tags: List[str] = []
    required_documents: List[RequiredDocument] = []


class TransitionRequest(BaseModel):
    target_state: str
    notes: Optional[str] = None
    actor_id: str = "system"
    actor_type: str = "staff"


class HoldRequest(BaseModel):
    reason: str
    actor_id: str = "system"


class RejectRequest(BaseModel):
    reason: str
    actor_id: str = "system"


class CertificateRequest(BaseModel):
    issued_by: str
    applicant_full_name: Optional[str] = None


class NoteRequest(BaseModel):
    note: str
    actor_id: str = "system"


class DocumentStatusUpdate(BaseModel):
    status: str  # pending | pending_review | verified | rejected | missing
    actor_id: str = "system"
