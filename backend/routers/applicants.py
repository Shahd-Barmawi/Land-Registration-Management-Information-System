from fastapi import APIRouter

router = APIRouter()

# Module 2 — Applicant Portal and Profiles
# Endpoints to implement:
#   POST   /applicants/
#   GET    /applicants/{applicant_id}
#   GET    /applicants/{applicant_id}/applications
#   POST   /applications/{application_id}/documents
#   POST   /applications/{application_id}/comments
#   POST   /applications/{application_id}/objections
#   GET    /applications/{application_id}/timeline
