from datetime import datetime


async def log_event(
    db,
    application_id: str,
    event_type: str,
    actor_type: str,
    actor_id: str,
    meta: dict | None = None,
):
    """Append an event to the performance_logs event_stream for an application."""
    event = {
        "type": event_type,
        "by": {"actor_type": actor_type, "actor_id": actor_id},
        "at": datetime.utcnow(),
        "meta": meta or {},
    }

    await db.performance_logs.update_one(
        {"application_id": application_id},
        {
            "$push": {"event_stream": event},
            "$setOnInsert": {
                "application_id": application_id,
                "computed_kpis": {
                    "processing_days": None,
                    "precheck_minutes": None,
                    "survey_delay_days": None,
                    "certificate_issued": False,
                },
            },
        },
        upsert=True,
    )
