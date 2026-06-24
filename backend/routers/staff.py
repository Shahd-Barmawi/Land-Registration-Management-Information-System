from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from bson import ObjectId
from pymongo import ReturnDocument
from typing import Optional

from config.database import get_db
from models.staff import StaffCreate
from utils.helpers import serialize_doc

router = APIRouter()


async def _next_seq(db, name: str) -> int:
    result = await db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return result["seq"]


# ── POST /staff/ ──────────────────────────────────────────────────────────────

@router.post("/", status_code=201)
async def create_staff(body: StaffCreate, db=Depends(get_db)):
    if body.role not in ("surveyor", "registrar"):
        raise HTTPException(400, "role must be 'surveyor' or 'registrar'")

    role_prefix = "SURV" if body.role == "surveyor" else "REGI"
    zone_code = "RM"
    if body.zone_ids:
        parts = body.zone_ids[0].split("-")
        # ZONE-RM-01  →  parts[1] = "RM"
        if len(parts) >= 2:
            zone_code = parts[1]

    seq = await _next_seq(db, f"staff_{body.role}_seq")
    staff_code = f"{role_prefix}-{zone_code}-{str(seq).zfill(2)}"

    # Guarantee uniqueness
    while await db.staff_members.find_one({"staff_code": staff_code}):
        seq = await _next_seq(db, f"staff_{body.role}_seq")
        staff_code = f"{role_prefix}-{zone_code}-{str(seq).zfill(2)}"

    now = datetime.utcnow()
    doc = {
        "staff_code": staff_code,
        "name": body.name,
        "role": body.role,
        "department": body.department,
        "skills": body.skills,
        "coverage": {
            "zone_ids": body.zone_ids,
            "geo_fence": body.geo_fence,
        },
        "schedule": {
            "timezone": "Asia/Jerusalem",
            "shifts": [s.model_dump() for s in body.shifts],
            "on_call": body.on_call,
        },
        "workload": {
            "active_tasks": 0,
            "max_tasks": body.max_tasks,
        },
        "contacts": {
            "email": body.email,
            "phone": body.phone,
        },
        "active": body.active,
        "created_at": now,
    }

    result = await db.staff_members.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


# ── GET /staff/ ───────────────────────────────────────────────────────────────

@router.get("/")
async def list_staff(
    role: Optional[str] = None,
    zone_id: Optional[str] = None,
    active: Optional[bool] = None,
    db=Depends(get_db),
):
    query: dict = {}
    if role:
        query["role"] = role
    if zone_id:
        query["coverage.zone_ids"] = zone_id
    if active is not None:
        query["active"] = active

    cursor = db.staff_members.find(query).sort("created_at", -1)
    members = await cursor.to_list(length=200)
    return [serialize_doc(m) for m in members]


# ── GET /staff/{staff_id} ─────────────────────────────────────────────────────

@router.get("/{staff_id}")
async def get_staff(staff_id: str, db=Depends(get_db)):
    # Try staff_code first, then ObjectId
    member = await db.staff_members.find_one({"staff_code": staff_id})
    if not member and ObjectId.is_valid(staff_id):
        member = await db.staff_members.find_one({"_id": ObjectId(staff_id)})
    if not member:
        raise HTTPException(404, f"Staff member '{staff_id}' not found")

    member_id_str = str(member["_id"])

    # Live workload counts from survey_tasks
    active_tasks = await db.survey_tasks.count_documents({
        "assigned_surveyor_id": member_id_str,
        "status": {"$nin": ["registrar_reviewed"]},
    })
    completed_tasks = await db.survey_tasks.count_documents({
        "assigned_surveyor_id": member_id_str,
        "status": "registrar_reviewed",
    })

    # Keep workload.active_tasks fresh
    await db.staff_members.update_one(
        {"_id": member["_id"]},
        {"$set": {"workload.active_tasks": active_tasks}},
    )

    result = serialize_doc(member)
    result["workload"]["active_tasks"] = active_tasks
    result["performance"] = {
        "active_tasks": active_tasks,
        "completed_tasks": completed_tasks,
        "total_tasks": active_tasks + completed_tasks,
    }
    return result
