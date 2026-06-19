from fastapi import APIRouter, Depends, HTTPException, Header, Query, UploadFile, File, Form
from fastapi.responses import Response
from typing import Optional
from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from config.database import get_db
from models.application import (
    ApplicationCreate, TransitionRequest,
    HoldRequest, RejectRequest, CertificateRequest,
    NoteRequest, DocumentStatusUpdate,
)
from services.workflow import (
    can_transition, get_allowed_next, validate_transition_guards,
    TIMESTAMP_FIELDS, CERTIFICATE_TYPE_MAP, TERMINAL_STATES,
    REJECTABLE_STATES, HOLDABLE_STATES,
)
from services.audit import log_event
from utils.helpers import serialize_doc

router = APIRouter()


# ── Counter helper ─────────────────────────────────────────────────────────────

async def _next_seq(db, name: str) -> int:
    result = await db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return result["seq"]


# ── POST /applications/ ────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_application(
    body: ApplicationCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db=Depends(get_db),
):
    # Idempotency: return existing doc if key already seen
    if idempotency_key:
        existing = await db.land_applications.find_one({"idempotency_key": idempotency_key})
        if existing:
            return serialize_doc(existing)

    year = datetime.utcnow().year
    seq = await _next_seq(db, "application_seq")
    application_id = f"LRMIS-{year}-{str(seq).zfill(4)}"

    now = datetime.utcnow()
    doc = {
        "application_id": application_id,
        "application_type": body.application_type,
        "status": "submitted",
        "priority": body.priority,
        "applicant_ref": body.applicant_ref.model_dump(),
        "parcel_ref": body.parcel_ref.model_dump(),
        "description": body.description,
        "tags": body.tags,
        "workflow": {
            "current_state": "submitted",
            "allowed_next": get_allowed_next("submitted"),
            "transition_rules_version": "v1.0",
        },
        "required_documents": [d.model_dump() for d in body.required_documents],
        "timestamps": {
            "submitted_at": now,
            "pre_checked_at": None,
            "survey_required_at": None,
            "surveyed_at": None,
            "legal_review_at": None,
            "approved_at": None,
            "certificate_issued_at": None,
            "closed_at": None,
            "updated_at": now,
        },
        "assignment": {
            "assigned_surveyor_id": None,
            "assigned_registrar_id": None,
            "assignment_policy": "zone+workload+availability",
        },
        "objection": {"has_objection": False, "objection_ids": []},
        "internal": {"notes": [], "visibility": "staff_only"},
        "rejection_reason": None,
        "hold_reason": None,
        "created_at": now,
    }

    if idempotency_key:
        doc["idempotency_key"] = idempotency_key

    result = await db.land_applications.insert_one(doc)
    doc["_id"] = result.inserted_id

    await log_event(
        db, application_id,
        event_type="submitted",
        actor_type=body.applicant_ref.applicant_type,
        actor_id=body.applicant_ref.applicant_id,
        meta={"channel": "api"},
    )

    return serialize_doc(doc)


# ── GET /applications/ ─────────────────────────────────────────────────────────

@router.get("/")
async def list_applications(
    applicant_id: Optional[str] = None,
    status: Optional[str] = None,
    application_type: Optional[str] = None,
    zone_id: Optional[str] = None,
    priority: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = Query(default="timestamps.submitted_at"),
    sort_order: int = Query(default=-1, description="-1 = descending, 1 = ascending"),
    db=Depends(get_db),
):
    query: dict = {}
    if applicant_id:
        query["applicant_ref.applicant_id"] = applicant_id
    if status:
        query["status"] = status
    if application_type:
        query["application_type"] = application_type
    if zone_id:
        query["parcel_ref.zone_id"] = zone_id
    if priority:
        query["priority"] = priority
    if date_from or date_to:
        date_filter: dict = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to
        query["timestamps.submitted_at"] = date_filter

    skip = (page - 1) * limit
    total = await db.land_applications.count_documents(query)
    cursor = db.land_applications.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    apps = await cursor.to_list(length=limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
        "data": [serialize_doc(a) for a in apps],
    }


# ── GET /applications/{application_id} ────────────────────────────────────────

@router.get("/{application_id}")
async def get_application(application_id: str, db=Depends(get_db)):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")
    return serialize_doc(app)


# ── PATCH /applications/{application_id}/transition ───────────────────────────

@router.patch("/{application_id}/transition")
async def transition_application(
    application_id: str,
    body: TransitionRequest,
    db=Depends(get_db),
):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    current = app["status"]
    target = body.target_state

    if current in TERMINAL_STATES:
        raise HTTPException(400, f"Application is in terminal state '{current}' and cannot be transitioned")

    if not can_transition(current, target):
        allowed = get_allowed_next(current)
        raise HTTPException(
            400,
            f"Transition '{current}' → '{target}' is not allowed. Allowed next states: {allowed}",
        )

    await validate_transition_guards(db, app, target)

    now = datetime.utcnow()
    set_fields: dict = {
        "status": target,
        "workflow.current_state": target,
        "workflow.allowed_next": get_allowed_next(target),
        "timestamps.updated_at": now,
    }

    ts_key = TIMESTAMP_FIELDS.get(target)
    if ts_key:
        set_fields[f"timestamps.{ts_key}"] = now

    update: dict = {"$set": set_fields}
    if body.notes:
        update["$push"] = {"internal.notes": f"[{now.isoformat()}] {body.notes}"}

    await db.land_applications.update_one({"application_id": application_id}, update)

    await log_event(
        db, application_id,
        event_type=target,
        actor_type=body.actor_type,
        actor_id=body.actor_id,
        meta={"from": current, "to": target, "notes": body.notes},
    )

    updated = await db.land_applications.find_one({"application_id": application_id})
    return serialize_doc(updated)


# ── POST /applications/{application_id}/hold ──────────────────────────────────

@router.post("/{application_id}/hold")
async def hold_application(
    application_id: str,
    body: HoldRequest,
    db=Depends(get_db),
):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    current = app["status"]
    if current not in HOLDABLE_STATES:
        raise HTTPException(400, f"Cannot place application in state '{current}' on hold")

    now = datetime.utcnow()
    await db.land_applications.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": "on_hold",
                "hold_reason": body.reason,
                "workflow.current_state": "on_hold",
                "workflow.allowed_next": get_allowed_next("on_hold"),
                "timestamps.updated_at": now,
            }
        },
    )

    await log_event(
        db, application_id,
        event_type="on_hold",
        actor_type="staff",
        actor_id=body.actor_id,
        meta={"reason": body.reason, "from": current},
    )

    updated = await db.land_applications.find_one({"application_id": application_id})
    return serialize_doc(updated)


# ── POST /applications/{application_id}/reject ────────────────────────────────

@router.post("/{application_id}/reject")
async def reject_application(
    application_id: str,
    body: RejectRequest,
    db=Depends(get_db),
):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    current = app["status"]
    if current not in REJECTABLE_STATES:
        raise HTTPException(400, f"Cannot reject application in state '{current}'")

    now = datetime.utcnow()
    await db.land_applications.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": body.reason,
                "workflow.current_state": "rejected",
                "workflow.allowed_next": [],
                "timestamps.updated_at": now,
            }
        },
    )

    await log_event(
        db, application_id,
        event_type="rejected",
        actor_type="staff",
        actor_id=body.actor_id,
        meta={"reason": body.reason, "from": current},
    )

    updated = await db.land_applications.find_one({"application_id": application_id})
    return serialize_doc(updated)


# ── POST /applications/{application_id}/certificate ───────────────────────────

@router.post("/{application_id}/certificate", status_code=201)
async def issue_certificate(
    application_id: str,
    body: CertificateRequest,
    db=Depends(get_db),
):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    if app["status"] != "approved":
        raise HTTPException(
            400,
            f"Certificate can only be issued for approved applications (current: '{app['status']}')",
        )

    existing_cert = await db.certificates.find_one({"application_id": application_id})
    if existing_cert:
        raise HTTPException(409, f"Certificate already issued: {existing_cert['certificate_id']}")

    year = datetime.utcnow().year
    seq = await _next_seq(db, "certificate_seq")
    certificate_id = f"CERT-{year}-{str(seq).zfill(4)}"

    now = datetime.utcnow()
    cert_type = CERTIFICATE_TYPE_MAP.get(app["application_type"], "ownership_certificate")

    cert_doc = {
        "certificate_id": certificate_id,
        "application_id": application_id,
        "parcel_id": app["parcel_ref"].get("parcel_id"),
        "certificate_type": cert_type,
        "status": "issued",
        "issued_to": {
            "applicant_id": app["applicant_ref"]["applicant_id"],
            "full_name": body.applicant_full_name or "N/A",
        },
        "issued_at": now,
        "issued_by": body.issued_by,
        "verification": {
            "qr_code_url": f"/certificates/{certificate_id}/verify",
            "digital_signature_stub": f"signed_{certificate_id}",
        },
        "created_at": now,
    }

    await db.certificates.insert_one(cert_doc)

    # Advance application to certificate_issued
    await db.land_applications.update_one(
        {"application_id": application_id},
        {
            "$set": {
                "status": "certificate_issued",
                "workflow.current_state": "certificate_issued",
                "workflow.allowed_next": get_allowed_next("certificate_issued"),
                "timestamps.certificate_issued_at": now,
                "timestamps.updated_at": now,
            }
        },
    )

    await log_event(
        db, application_id,
        event_type="certificate_issued",
        actor_type="registrar",
        actor_id=body.issued_by,
        meta={"certificate_id": certificate_id},
    )

    await db.performance_logs.update_one(
        {"application_id": application_id},
        {"$set": {"computed_kpis.certificate_issued": True}},
    )

    cert_doc.pop("_id", None)
    return cert_doc


# ── POST /applications/{application_id}/documents/upload ─────────────────────

@router.post("/{application_id}/documents/upload")
async def upload_document(
    application_id: str,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    db=Depends(get_db),
):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    bucket = AsyncIOMotorGridFSBucket(db, bucket_name="documents")
    file_id = await bucket.upload_from_stream(
        file.filename,
        file.file,
        metadata={
            "application_id": application_id,
            "document_type": document_type,
            "content_type": file.content_type,
        },
    )

    now = datetime.utcnow()
    existing_types = [d["document_type"] for d in app.get("required_documents", [])]

    if document_type in existing_types:
        await db.land_applications.update_one(
            {"application_id": application_id, "required_documents.document_type": document_type},
            {
                "$set": {
                    "required_documents.$.file_id": str(file_id),
                    "required_documents.$.filename": file.filename,
                    "required_documents.$.content_type": file.content_type,
                    "required_documents.$.status": "pending_review",
                    "required_documents.$.uploaded_at": now.isoformat(),
                    "timestamps.updated_at": now,
                }
            },
        )
    else:
        await db.land_applications.update_one(
            {"application_id": application_id},
            {
                "$push": {
                    "required_documents": {
                        "document_type": document_type,
                        "required": True,
                        "status": "pending_review",
                        "file_id": str(file_id),
                        "filename": file.filename,
                        "content_type": file.content_type,
                        "uploaded_at": now.isoformat(),
                    }
                },
                "$set": {"timestamps.updated_at": now},
            },
        )

    await log_event(
        db, application_id,
        event_type="document_uploaded",
        actor_type="applicant",
        actor_id=app["applicant_ref"]["applicant_id"],
        meta={"document_type": document_type, "filename": file.filename, "file_id": str(file_id)},
    )

    updated = await db.land_applications.find_one({"application_id": application_id})
    return serialize_doc(updated)


# ── GET /applications/{application_id}/documents/{file_id} ───────────────────

@router.get("/{application_id}/documents/{file_id}")
async def download_document(application_id: str, file_id: str, db=Depends(get_db)):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    # Verify the file belongs to this application
    docs = app.get("required_documents", [])
    if not any(d.get("file_id") == file_id for d in docs):
        raise HTTPException(403, "File does not belong to this application")

    try:
        bucket = AsyncIOMotorGridFSBucket(db, bucket_name="documents")
        grid_out = await bucket.open_download_stream(ObjectId(file_id))
        content = await grid_out.read()
        media_type = grid_out.metadata.get("content_type", "application/octet-stream")
        filename = grid_out.filename or file_id
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    except Exception:
        raise HTTPException(404, "File not found in storage")


# ── POST /applications/{application_id}/notes ────────────────────────────────

@router.post("/{application_id}/notes", status_code=201)
async def add_note(application_id: str, body: NoteRequest, db=Depends(get_db)):
    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    now = datetime.utcnow()
    entry = f"[{now.isoformat()}] [{body.actor_id}] {body.note}"

    await db.land_applications.update_one(
        {"application_id": application_id},
        {
            "$push": {"internal.notes": entry},
            "$set":  {"timestamps.updated_at": now},
        },
    )

    await log_event(
        db, application_id,
        event_type="note_added",
        actor_type="staff",
        actor_id=body.actor_id,
        meta={"note": body.note},
    )

    updated = await db.land_applications.find_one({"application_id": application_id})
    return serialize_doc(updated)


# ── PATCH /applications/{application_id}/documents/{document_type}/status ────

VALID_DOC_STATUSES = {"pending", "pending_review", "verified", "rejected", "missing"}

@router.patch("/{application_id}/documents/{document_type}/status")
async def update_document_status(
    application_id: str,
    document_type: str,
    body: DocumentStatusUpdate,
    db=Depends(get_db),
):
    if body.status not in VALID_DOC_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {sorted(VALID_DOC_STATUSES)}")

    app = await db.land_applications.find_one({"application_id": application_id})
    if not app:
        raise HTTPException(404, f"Application '{application_id}' not found")

    now = datetime.utcnow()
    result = await db.land_applications.update_one(
        {"application_id": application_id, "required_documents.document_type": document_type},
        {
            "$set": {
                "required_documents.$.status": body.status,
                "timestamps.updated_at": now,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(404, f"Document type '{document_type}' not found in application")

    await log_event(
        db, application_id,
        event_type="document_status_updated",
        actor_type="staff",
        actor_id=body.actor_id,
        meta={"document_type": document_type, "new_status": body.status},
    )

    updated = await db.land_applications.find_one({"application_id": application_id})
    return serialize_doc(updated)
