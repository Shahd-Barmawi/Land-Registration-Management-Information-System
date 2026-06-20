from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from fastapi import Body

from config.database import get_db
from models.applicant import ApplicantCreate
from utils.helpers import serialize_doc

router = APIRouter()

# Module 2 — Applicant Portal and Profiles
#   POST   /applicants/
@router.post("/", status_code=201)
async def create_applicant(
    body: ApplicantCreate,
    db=Depends(get_db),
):
    existing = await db.applicants.find_one(
    {"identity.national_id": body.national_id}
    )   

    if existing:
        raise HTTPException(
            409,
            "Applicant with this national ID already exists"
        )

    doc = {
        "full_name": body.full_name,
        "applicant_type": body.applicant_type,

        "identity": {
            "national_id": body.national_id,
            "verified": False,
        },

        "contacts": {
            "email": body.email,
            "phone": body.phone,
        },

        "address": {
            "city": body.city,
            "zone_id": body.zone_id,
        },

        "preferences": {
            "language": body.preferred_language,

            "notifications": {
                "on_status_change": body.notify_status_change,
                "on_missing_documents": body.notify_missing_documents,
                "on_certificate_ready": body.notify_certificate_ready,
            }
        },

        "privacy_settings": body.privacy_settings,

        "created_at": datetime.utcnow(),
    }

    result = await db.applicants.insert_one(doc)

    doc["_id"] = result.inserted_id

    return serialize_doc(doc)
#   GET    /applicants/{applicant_id}
@router.get("/{applicant_id}")
async def get_applicant(
    applicant_id: str,
    db=Depends(get_db),
):
    applicant = await db.applicants.find_one(
        {"_id": ObjectId(applicant_id)}
    )

    if not applicant:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found"
        )

    return serialize_doc(applicant)

#   GET    /applicants/{applicant_id}/applications
@router.get("/{applicant_id}/applications")
async def get_applicant_applications(
    applicant_id: str,
    db=Depends(get_db),
):
    applications = await db.land_applications.find(
        {
            "applicant_ref.applicant_id": applicant_id
        }
    ).to_list(length=None)

    return [
        serialize_doc(app)
        for app in applications
    ]

#   POST   /applications/{application_id}/documents
@router.post("/applications/{application_id}/documents")
async def upload_document(
    application_id: str,
    body: dict = Body(...),
    db=Depends(get_db),
):
    document = {
        "application_id": application_id,
        "document_type": body.get("document_type"),
        "file_name": body.get("file_name"),
        "uploaded_at": datetime.utcnow(),
    }

    result = await db.documents.insert_one(document)

    document["_id"] = result.inserted_id

    return serialize_doc(document)

#   POST   /applications/{application_id}/comments
@router.post("/applications/{application_id}/comments")
async def add_comment(
    application_id: str,
    body: dict = Body(...),
    db=Depends(get_db),
):
    comment = {
        "application_id": application_id,
        "comment": body.get("comment"),
        "author": body.get("author"),
        "created_at": datetime.utcnow(),
    }

    result = await db.comments.insert_one(comment)

    comment["_id"] = result.inserted_id

    return serialize_doc(comment)

#   POST   /applications/{application_id}/objections
@router.post("/applications/{application_id}/objections")
async def create_objection(
    application_id: str,
    body: dict = Body(...),
    db=Depends(get_db),
):
    objection = {
        "application_id": application_id,
        "reason": body.get("reason"),
        "submitted_by": body.get("submitted_by"),
        "status": "submitted",
        "created_at": datetime.utcnow(),
    }

    result = await db.objections.insert_one(objection)

    objection["_id"] = result.inserted_id

    return serialize_doc(objection)

#   GET    /applications/{application_id}/timeline
@router.get("/applications/{application_id}/timeline")
async def get_timeline(
    application_id: str,
    db=Depends(get_db),
):
    events = await db.audit_logs.find(
        {"application_id": application_id}
    ).sort("created_at", 1).to_list(length=None)

    return [
        serialize_doc(event)
        for event in events
    ]