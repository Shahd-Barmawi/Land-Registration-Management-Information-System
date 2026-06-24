from fastapi import APIRouter, Depends, Query
from typing import Optional

from config.database import get_db

router = APIRouter()

# ── GET /analytics/kpis ───────────────────────────────────────────────────────

@router.get("/kpis")
async def get_kpis(db=Depends(get_db)):
    """Main KPIs — uses $facet to run 7 sub-aggregations in one pass."""
    pipeline = [
        {"$facet": {
            "total": [{"$count": "n"}],
            "approved": [{"$match": {"status": "approved"}}, {"$count": "n"}],
            "rejected": [{"$match": {"status": "rejected"}}, {"$count": "n"}],
            "certificate_issued": [{"$match": {"status": "certificate_issued"}}, {"$count": "n"}],
            "pending": [
                {"$match": {"status": {"$nin": ["approved", "rejected", "certificate_issued", "closed"]}}},
                {"$count": "n"},
            ],
            "under_objection": [{"$match": {"status": "under_objection"}}, {"$count": "n"}],
            "by_status": [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ],
            "avg_processing": [
                {"$match": {
                    "timestamps.approved_at": {"$ne": None},
                    "timestamps.submitted_at": {"$ne": None},
                }},
                {"$project": {
                    "days": {"$divide": [
                        {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                        86400000,
                    ]}
                }},
                {"$group": {"_id": None, "avg": {"$avg": "$days"}}},
            ],
        }}
    ]

    res = await db.land_applications.aggregate(pipeline).to_list(1)
    if not res:
        return {"total": 0}

    r = res[0]

    def first_n(arr):
        return arr[0]["n"] if arr else 0

    avg_raw = r.get("avg_processing", [])
    avg_days = round(avg_raw[0]["avg"], 1) if avg_raw and avg_raw[0].get("avg") is not None else None

    total_certs = await db.certificates.count_documents({})

    return {
        "total": first_n(r.get("total", [])),
        "approved": first_n(r.get("approved", [])),
        "rejected": first_n(r.get("rejected", [])),
        "certificate_issued": first_n(r.get("certificate_issued", [])),
        "pending": first_n(r.get("pending", [])),
        "under_objection": first_n(r.get("under_objection", [])),
        "total_certificates": total_certs,
        "avg_processing_days": avg_days,
        "by_status": {item["_id"]: item["count"] for item in r.get("by_status", [])},
    }


# ── GET /analytics/applications-by-status ─────────────────────────────────────

@router.get("/applications-by-status")
async def applications_by_status(db=Depends(get_db)):
    """Count applications per status using $group and $sort."""
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"status": "$_id", "count": 1, "_id": 0}},
    ]
    return await db.land_applications.aggregate(pipeline).to_list(50)


# ── GET /analytics/applications-by-zone ───────────────────────────────────────

@router.get("/applications-by-zone")
async def applications_by_zone(db=Depends(get_db)):
    """Count applications per zone with status breakdown using $group and $project."""
    pipeline = [
        {"$group": {
            "_id": "$parcel_ref.zone_id",
            "total": {"$sum": 1},
            "pending": {"$sum": {"$cond": [
                {"$in": ["$status", ["submitted", "pre_checked", "survey_required", "surveyed", "legal_review"]]},
                1, 0,
            ]}},
            "approved": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}},
            "rejected": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}},
        }},
        {"$sort": {"total": -1}},
        {"$project": {"zone_id": "$_id", "total": 1, "pending": 1, "approved": 1, "rejected": 1, "_id": 0}},
    ]
    return await db.land_applications.aggregate(pipeline).to_list(100)


# ── GET /analytics/processing-time ────────────────────────────────────────────

@router.get("/processing-time")
async def processing_time(db=Depends(get_db)):
    """Average processing days by type ($group) + distribution buckets ($bucketAuto)."""

    by_type_pipeline = [
        {"$match": {
            "timestamps.approved_at": {"$ne": None},
            "timestamps.submitted_at": {"$ne": None},
        }},
        {"$project": {
            "application_type": 1,
            "days": {"$divide": [
                {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                86400000,
            ]},
        }},
        {"$group": {
            "_id": "$application_type",
            "avg_days": {"$avg": "$days"},
            "min_days": {"$min": "$days"},
            "max_days": {"$max": "$days"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"avg_days": -1}},
        {"$project": {
            "application_type": "$_id",
            "avg_days": {"$round": ["$avg_days", 1]},
            "min_days": {"$round": ["$min_days", 1]},
            "max_days": {"$round": ["$max_days", 1]},
            "count": 1,
            "_id": 0,
        }},
    ]
    by_type = await db.land_applications.aggregate(by_type_pipeline).to_list(20)

    # $bucketAuto distributes approved apps into 5 processing-time bands
    bucket_pipeline = [
        {"$match": {
            "timestamps.approved_at": {"$ne": None},
            "timestamps.submitted_at": {"$ne": None},
        }},
        {"$project": {
            "days": {"$divide": [
                {"$subtract": ["$timestamps.approved_at", "$timestamps.submitted_at"]},
                86400000,
            ]},
        }},
        {"$bucketAuto": {
            "groupBy": "$days",
            "buckets": 5,
            "output": {
                "count": {"$sum": 1},
                "avg_days": {"$avg": "$days"},
            },
        }},
    ]
    raw_buckets = await db.land_applications.aggregate(bucket_pipeline).to_list(10)

    def fmt_bucket(b):
        bnd = b.get("_id", {})
        return {
            "min_days": round(bnd.get("min") or 0, 1),
            "max_days": round(bnd.get("max") or 0, 1),
            "count": b.get("count", 0),
            "avg_days": round(b.get("avg_days") or 0, 1),
        }

    return {
        "by_type": by_type,
        "distribution_buckets": [fmt_bucket(b) for b in raw_buckets],
    }


# ── GET /analytics/surveyors ──────────────────────────────────────────────────

@router.get("/surveyors")
async def surveyors_analytics(db=Depends(get_db)):
    """Surveyor productivity using $lookup, $unwind, $group from survey_tasks."""
    pipeline = [
        {"$match": {"assigned_surveyor_id": {"$nin": [None, ""]}}},
        # Convert string ID → ObjectId for $lookup
        {"$addFields": {
            "surveyor_oid": {
                "$cond": [
                    {"$ne": ["$assigned_surveyor_id", None]},
                    {"$toObjectId": "$assigned_surveyor_id"},
                    None,
                ]
            }
        }},
        {"$lookup": {
            "from": "staff_members",
            "localField": "surveyor_oid",
            "foreignField": "_id",
            "as": "staff",
        }},
        {"$unwind": {"path": "$staff", "preserveNullAndEmptyArrays": True}},
        {"$group": {
            "_id": "$assigned_surveyor_id",
            "staff_code":  {"$first": "$staff.staff_code"},
            "staff_name":  {"$first": "$staff.name"},
            "department":  {"$first": "$staff.department"},
            "max_tasks":   {"$first": "$staff.workload.max_tasks"},
            "total_tasks": {"$sum": 1},
            "active_tasks":    {"$sum": {"$cond": [{"$ne": ["$status", "registrar_reviewed"]}, 1, 0]}},
            "completed_tasks": {"$sum": {"$cond": [{"$eq": ["$status", "registrar_reviewed"]}, 1, 0]}},
        }},
        {"$sort": {"active_tasks": -1}},
        {"$project": {
            "surveyor_id": "$_id",
            "staff_code": 1, "staff_name": 1, "department": 1,
            "total_tasks": 1, "active_tasks": 1, "completed_tasks": 1, "max_tasks": 1,
            "_id": 0,
        }},
    ]
    return await db.survey_tasks.aggregate(pipeline).to_list(50)


# ── GET /analytics/registrars ─────────────────────────────────────────────────

@router.get("/registrars")
async def registrars_analytics(db=Depends(get_db)):
    """Registrar workload using $unwind + $match + $group on performance_logs."""
    pipeline = [
        {"$unwind": "$event_stream"},
        {"$match": {"event_stream.by.actor_type": "registrar"}},
        {"$group": {
            "_id": "$event_stream.by.actor_id",
            "total_actions":   {"$sum": 1},
            "reviews":   {"$sum": {"$cond": [{"$eq": ["$event_stream.type", "registrar_review"]}, 1, 0]}},
            "approvals": {"$sum": {"$cond": [{"$eq": ["$event_stream.type", "approved"]}, 1, 0]}},
            "rejections":{"$sum": {"$cond": [{"$eq": ["$event_stream.type", "rejected"]}, 1, 0]}},
            "pre_checks":{"$sum": {"$cond": [{"$eq": ["$event_stream.type", "pre_checked"]}, 1, 0]}},
        }},
        {"$sort": {"total_actions": -1}},
        {"$project": {
            "registrar_id": "$_id",
            "total_actions": 1, "reviews": 1, "approvals": 1, "rejections": 1, "pre_checks": 1,
            "_id": 0,
        }},
    ]
    return await db.performance_logs.aggregate(pipeline).to_list(50)


# ── GET /analytics/geofeeds/parcels ───────────────────────────────────────────

@router.get("/geofeeds/parcels")
async def geofeed_parcels(
    zone_id: Optional[str] = None,
    status: Optional[str] = None,
    db=Depends(get_db),
):
    """GeoJSON FeatureCollection of parcels with geometry. Uses $geoNear for proximity sort."""
    match_filter: dict = {"geometry": {"$ne": None}}
    if zone_id:
        match_filter["zone_id"] = zone_id
    if status:
        match_filter["registration_status"] = status

    project_stage = {
        "$project": {
            "_id": 0,
            "type": {"$literal": "Feature"},
            "geometry": 1,
            "properties": {
                "parcel_code": "$parcel_code",
                "parcel_number": "$parcel_number",
                "block_number": "$block_number",
                "zone_id": "$zone_id",
                "registration_status": "$registration_status",
                "dispute_state": "$dispute_state",
                "land_use": "$land_use",
                "area_sqm": "$area_sqm",
                "address_hint": "$address_hint",
            },
        }
    }

    try:
        # $geoNear — sorted by distance from Ramallah centre
        pipeline = [
            {"$geoNear": {
                "near": {"type": "Point", "coordinates": [35.2, 31.9]},
                "distanceField": "distance_m",
                "spherical": True,
                "query": match_filter,
            }},
            project_stage,
        ]
        features = await db.parcels.aggregate(pipeline).to_list(500)
    except Exception:
        # Fallback if 2dsphere index not yet created or no geometry docs
        cursor = db.parcels.find(match_filter)
        raw = await cursor.to_list(500)
        features = [
            {
                "type": "Feature",
                "geometry": p.get("geometry"),
                "properties": {k: v for k, v in p.items() if k not in ("_id", "geometry")},
            }
            for p in raw
        ]

    return {"type": "FeatureCollection", "features": features, "count": len(features)}


# ── GET /analytics/geofeeds/pending-heatmap ───────────────────────────────────

@router.get("/geofeeds/pending-heatmap")
async def pending_heatmap(db=Depends(get_db)):
    """GeoJSON of pending applications joined to parcel geometry via $lookup + $unwind."""
    pipeline = [
        {"$match": {
            "status": {"$nin": ["approved", "certificate_issued", "closed", "rejected"]},
            "parcel_ref.parcel_id": {"$nin": [None, ""]},
        }},
        {"$addFields": {
            "parcel_oid": {
                "$cond": [
                    {"$ne": ["$parcel_ref.parcel_id", None]},
                    {"$toObjectId": "$parcel_ref.parcel_id"},
                    None,
                ]
            }
        }},
        {"$lookup": {
            "from": "parcels",
            "localField": "parcel_oid",
            "foreignField": "_id",
            "as": "parcel_doc",
        }},
        {"$unwind": {"path": "$parcel_doc", "preserveNullAndEmptyArrays": False}},
        {"$match": {"parcel_doc.geometry": {"$ne": None}}},
        {"$project": {
            "_id": 0,
            "type": {"$literal": "Feature"},
            "geometry": "$parcel_doc.geometry",
            "properties": {
                "application_id": "$application_id",
                "status": "$status",
                "priority": "$priority",
                "zone_id": "$parcel_ref.zone_id",
                "application_type": "$application_type",
            },
        }},
    ]

    try:
        features = await db.land_applications.aggregate(pipeline).to_list(500)
    except Exception:
        features = []

    return {"type": "FeatureCollection", "features": features, "count": len(features)}
