from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.database import connect_db, close_db
from routers import applications, parcels, applicants, staff, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="LRMIS — Land Registration Management Information System",
    description=(
        "A geo-enabled, workflow-driven platform for managing land registration services, "
        "property ownership records, parcel cadastral information, field survey tasks, "
        "registrar review, objections, and official certificate issuance."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(parcels.router,      prefix="/parcels",      tags=["Parcels"])
app.include_router(applicants.router,   prefix="/applicants",   tags=["Applicants"])
app.include_router(staff.router,        prefix="/staff",        tags=["Staff"])
app.include_router(analytics.router,    prefix="/analytics",    tags=["Analytics"])


@app.get("/", tags=["Health"])
async def root():
    return {"system": "LRMIS", "status": "running", "version": "1.0.0"}
