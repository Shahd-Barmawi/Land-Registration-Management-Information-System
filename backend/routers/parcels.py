from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId

from config.database import get_db
from models.parcel import ParcelCreate, ParcelUpdate
from utils.helpers import serialize_doc

router = APIRouter()


@router.post("/", status_code=201)
async def create_parcel(body: ParcelCreate, db=Depends(get_db)):
    # Parse ZONE-{CITY}-{NUM} → {CITY}-Z{NUM}-B{block}-P{parcel}
    parts = body.zone_id.split("-")
    city     = parts[1] if len(parts) >= 2 else body.zone_id
    zone_num = parts[2] if len(parts) >= 3 else "00"
    parcel_code = f"{city}-Z{zone_num}-B{body.block_number}-P{body.parcel_number}"

    if await db.parcels.find_one({"parcel_code": parcel_code}):
        raise HTTPException(409, f"Parcel '{parcel_code}' already exists")

    now = datetime.utcnow()
    doc: dict = {
        "parcel_code": parcel_code,
        "parcel_number": body.parcel_number,
        "block_number": body.block_number,
        "basin_number": body.basin_number,
        "zone_id": body.zone_id,
        "current_owner_refs": [r.model_dump() for r in body.current_owner_refs],
        "area_sqm": body.area_sqm,
        "land_use": body.land_use,
        "registration_status": "unregistered",
        "address_hint": body.address_hint,
        "dispute_state": "none",
        "created_at": now,
        "updated_at": now,
    }

    # Only store geometry when provided — 2dsphere index rejects explicit null
    if body.geometry:
        doc["geometry"] = body.geometry.model_dump()

    result = await db.parcels.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.get("/{parcel_id}")
async def get_parcel(parcel_id: str, db=Depends(get_db)):
    # Accept either MongoDB ObjectId string or parcel_code
    if ObjectId.is_valid(parcel_id):
        parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    else:
        parcel = await db.parcels.find_one({"parcel_code": parcel_id})

    if not parcel:
        raise HTTPException(404, f"Parcel '{parcel_id}' not found")
    return serialize_doc(parcel)


@router.patch("/{parcel_id}")
async def update_parcel(parcel_id: str, body: ParcelUpdate, db=Depends(get_db)):
    if not ObjectId.is_valid(parcel_id):
        raise HTTPException(400, "Invalid parcel ID — must be a valid ObjectId")

    parcel = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    if not parcel:
        raise HTTPException(404, f"Parcel '{parcel_id}' not found")

    updates = body.model_dump(exclude_none=True)
    if "geometry" in updates and body.geometry:
        updates["geometry"] = body.geometry.model_dump()

    if not updates:
        raise HTTPException(400, "No fields to update")

    updates["updated_at"] = datetime.utcnow()
    await db.parcels.update_one({"_id": ObjectId(parcel_id)}, {"$set": updates})

    updated = await db.parcels.find_one({"_id": ObjectId(parcel_id)})
    return serialize_doc(updated)


@router.get("/")
async def list_parcels(
    zone_id: str | None = None,
    registration_status: str | None = None,
    dispute_state: str | None = None,
    db=Depends(get_db),
):
    query: dict = {}
    if zone_id:
        query["zone_id"] = zone_id
    if registration_status:
        query["registration_status"] = registration_status
    if dispute_state:
        query["dispute_state"] = dispute_state

    parcels = await db.parcels.find(query).to_list(length=200)
    return [serialize_doc(p) for p in parcels]
