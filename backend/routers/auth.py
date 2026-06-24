from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from config.database import get_db
from models.auth import RegisterRequest, LoginRequest
from services.jwt_service import (
    hash_password, verify_password, create_access_token, get_current_user
)
from utils.helpers import serialize_doc

router = APIRouter()


def _user_payload(user: dict, applicant_id: str) -> dict:
    return {
        "user_id":      str(user["_id"]),
        "email":        user["email"],
        "full_name":    user["full_name"],
        "role":         user["role"],
        "applicant_id": applicant_id,
    }


# ── POST /auth/register ───────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db=Depends(get_db)):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(409, "Email already registered")

    # Create applicant profile (reuse same structure as /applicants/)
    existing_applicant = await db.applicants.find_one(
        {"identity.national_id": body.national_id}
    )

    if existing_applicant:
        # National ID already has an applicant profile — check if already linked to a user
        if await db.users.find_one({"national_id": body.national_id}):
            raise HTTPException(409, "This National ID is already linked to an account")
        applicant_id = str(existing_applicant["_id"])
    else:
        applicant_doc = {
            "full_name":      body.full_name,
            "applicant_type": body.applicant_type,
            "identity": {
                "national_id": body.national_id,
                "verified":    False,
            },
            "contacts": {
                "email": body.email,
                "phone": body.phone,
            },
            "address": {
                "city":    body.city,
                "zone_id": body.zone_id,
            },
            "preferences": {
                "language": "en",
                "notifications": {
                    "on_status_change":       True,
                    "on_missing_documents":   True,
                    "on_certificate_ready":   True,
                },
            },
            "privacy_settings": {},
            "created_at": datetime.utcnow(),
        }
        result = await db.applicants.insert_one(applicant_doc)
        applicant_id = str(result.inserted_id)

    user_doc = {
        "email":        body.email,
        "full_name":    body.full_name,
        "national_id":  body.national_id,
        "hashed_password": hash_password(body.password),
        "role":         "applicant",
        "applicant_id": applicant_id,
        "created_at":   datetime.utcnow(),
    }
    inserted = await db.users.insert_one(user_doc)
    user_doc["_id"] = inserted.inserted_id

    payload = _user_payload(user_doc, applicant_id)
    token = create_access_token(payload)

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user":         payload,
    }


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest, db=Depends(get_db)):
    user = await db.users.find_one({"email": body.email})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid email or password")

    payload = _user_payload(user, user["applicant_id"])
    token = create_access_token(payload)

    return {
        "access_token": token,
        "token_type":   "bearer",
        "user":         payload,
    }


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return current_user
