from fastapi import APIRouter

router = APIRouter()

# Module 3 — Surveyors, Registrar, and Assignment
# Endpoints to implement:
#   POST   /staff/
#   GET    /staff/{staff_id}
#   POST   /applications/{application_id}/auto-assign-surveyor
#   PATCH  /applications/{application_id}/survey-milestone
#   POST   /applications/{application_id}/survey-report
#   PATCH  /applications/{application_id}/registrar-review
