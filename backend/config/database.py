import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "Land_Registration_Management_Information_System")

_client: AsyncIOMotorClient = None


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(MONGODB_URL)
    await _create_indexes()
    print(f"Connected to MongoDB: {DATABASE_NAME}")


async def close_db():
    if _client:
        _client.close()
        print("MongoDB connection closed")


def get_db():
    return _client[DATABASE_NAME]


async def _create_indexes():
    db = get_db()

    # land_applications
    await db.land_applications.create_index("application_id", unique=True)
    await db.land_applications.create_index("status")
    await db.land_applications.create_index("application_type")
    await db.land_applications.create_index("parcel_ref.parcel_number")
    await db.land_applications.create_index("parcel_ref.zone_id")
    await db.land_applications.create_index("timestamps.submitted_at")
    await db.land_applications.create_index("applicant_ref.applicant_id")
    await db.land_applications.create_index(
        "idempotency_key", unique=True, sparse=True
    )

    # parcels — 2dsphere requires the field to be absent (not null) for unpopulated docs
    await db.parcels.create_index("parcel_code", unique=True)
    await db.parcels.create_index([("geometry", "2dsphere")])
    await db.parcels.create_index("zone_id")

    # applicants
    await db.applicants.create_index("identity.national_id", unique=True)

    # staff
    await db.staff_members.create_index("staff_code", unique=True)

    # survey tasks
    await db.survey_tasks.create_index("application_id")

    # certificates
    await db.certificates.create_index("certificate_id", unique=True)

    print("MongoDB indexes created")
