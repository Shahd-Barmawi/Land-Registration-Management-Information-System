from pydantic import BaseModel
from typing import Optional


# Full model implemented by Module 3
class SurveyMilestoneUpdate(BaseModel):
    milestone: str  # assigned | visit_scheduled | arrived_on_site | survey_started | survey_completed | report_uploaded | registrar_reviewed
    notes: Optional[str] = None
    actor_id: str = "system"


class SurveyReportCreate(BaseModel):
    application_id: str
    surveyor_id: str
    report_summary: Optional[str] = None
    report_file_url: Optional[str] = None
    findings: Optional[str] = None
