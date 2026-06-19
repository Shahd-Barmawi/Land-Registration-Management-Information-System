from fastapi import HTTPException
from bson import ObjectId

# ── Allowed state transitions ──────────────────────────────────────────────────
ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "submitted":         ["pre_checked", "missing_documents", "rejected"],
    "pre_checked":       ["survey_required", "legal_review", "missing_documents", "on_hold", "rejected"],
    "survey_required":   ["surveyed", "missing_documents", "on_hold", "rejected"],
    "surveyed":          ["legal_review", "missing_documents", "on_hold", "rejected"],
    "legal_review":      ["approved", "missing_documents", "under_objection", "on_hold", "rejected"],
    "approved":          ["certificate_issued"],
    "certificate_issued": ["closed"],
    "missing_documents": ["pre_checked", "rejected", "on_hold"],
    "under_objection":   ["legal_review", "rejected", "on_hold"],
    "on_hold":           ["pre_checked", "survey_required", "legal_review", "rejected"],
    "rejected":          [],
    "closed":            [],
}

# States that map to a timestamps.* field
TIMESTAMP_FIELDS: dict[str, str] = {
    "submitted":          "submitted_at",
    "pre_checked":        "pre_checked_at",
    "survey_required":    "survey_required_at",
    "surveyed":           "surveyed_at",
    "legal_review":       "legal_review_at",
    "approved":           "approved_at",
    "certificate_issued": "certificate_issued_at",
    "closed":             "closed_at",
}

# Certificate type per application type
CERTIFICATE_TYPE_MAP: dict[str, str] = {
    "first_registration":   "first_registration_certificate",
    "ownership_transfer":   "ownership_certificate",
    "parcel_subdivision":   "subdivision_certificate",
    "parcel_merge":         "merge_certificate",
    "boundary_correction":  "boundary_correction_certificate",
    "certificate_request":  "ownership_certificate",
}

TERMINAL_STATES = {"rejected", "closed"}
REJECTABLE_STATES = {
    "submitted", "pre_checked", "survey_required", "surveyed",
    "legal_review", "missing_documents", "under_objection", "on_hold",
}
HOLDABLE_STATES = {
    "submitted", "pre_checked", "survey_required", "surveyed",
    "legal_review", "missing_documents", "under_objection",
}


def get_allowed_next(state: str) -> list[str]:
    return ALLOWED_TRANSITIONS.get(state, [])


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, [])


async def validate_transition_guards(db, application: dict, target_state: str):
    """Raise HTTPException 400 if the transition pre-condition is not satisfied."""

    if target_state == "pre_checked":
        ref = application.get("applicant_ref", {})
        if not ref.get("applicant_id"):
            raise HTTPException(400, "applicant_id is required before pre-check")
        parcel = application.get("parcel_ref", {})
        missing = [f for f in ("parcel_number", "block_number", "basin_number", "zone_id") if not parcel.get(f)]
        if missing:
            raise HTTPException(400, f"Parcel fields missing before pre-check: {missing}")

    elif target_state == "survey_required":
        parcel_id = application.get("parcel_ref", {}).get("parcel_id")
        if not parcel_id:
            raise HTTPException(400, "parcel_id must be set (link a parcel) before requiring a survey")
        try:
            parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
        except Exception:
            raise HTTPException(400, "Invalid parcel_id format")
        if not parcel or not parcel.get("geometry"):
            raise HTTPException(400, "Parcel must have a valid GeoJSON geometry before survey can be required")

    elif target_state == "surveyed":
        app_id = application.get("application_id")
        task = await db.survey_tasks.find_one({"application_id": app_id, "report_uploaded": True})
        if not task:
            raise HTTPException(400, "A survey report must be uploaded before marking as surveyed")

    elif target_state == "legal_review":
        docs = application.get("required_documents", [])
        uploaded = [d for d in docs if d.get("status") in ("pending_review", "verified")]
        if not uploaded:
            raise HTTPException(400, "At least one ownership document must be uploaded before legal review")

    elif target_state == "approved":
        ts = application.get("timestamps", {})
        if not ts.get("legal_review_at"):
            raise HTTPException(400, "Legal review must be completed (legal_review_at timestamp required) before approval")

    elif target_state == "certificate_issued":
        if application.get("status") != "approved":
            raise HTTPException(400, "Application must be in 'approved' state to issue a certificate")
