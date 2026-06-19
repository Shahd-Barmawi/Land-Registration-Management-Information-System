from pydantic import BaseModel
from typing import Optional


class CertificateVerification(BaseModel):
    qr_code_url: str
    digital_signature_stub: str


class CertificateResponse(BaseModel):
    certificate_id: str
    application_id: str
    parcel_id: Optional[str]
    certificate_type: str
    status: str
    issued_by: str
    verification: CertificateVerification
