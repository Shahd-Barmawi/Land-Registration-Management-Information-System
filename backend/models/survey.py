from pydantic import BaseModel
from typing import Optional, Dict, Any


VALID_MILESTONES = [
    "assigned",
    "visit_scheduled",
    "arrived_on_site",
    "survey_started",
    "survey_completed",
    "report_uploaded",
    "registrar_reviewed",
]
MILESTONE_ORDER = {m: i for i, m in enumerate(VALID_MILESTONES)}


class SurveyMilestoneUpdate(BaseModel):
    milestone: str              # one of VALID_MILESTONES
    notes: Optional[str] = None
    actor_id: str = "system"
    meta: Optional[Dict[str, Any]] = None   # e.g. {"scheduled_date": "2026-02-05"}


class SurveyReportCreate(BaseModel):
    surveyor_id: str
    report_summary: Optional[str] = None
    findings: Optional[str] = None
    field_notes: Optional[str] = None


class RegistrarReviewRequest(BaseModel):
    decision: str               # approve | reject | hold | note
    notes: Optional[str] = None
    actor_id: str = "registrar"
