from pydantic import BaseModel
from typing import Optional, List


class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]


class OwnerRef(BaseModel):
    applicant_id: str
    share: str = "1/1"


class ParcelCreate(BaseModel):
    parcel_number: str
    block_number: str
    basin_number: str
    zone_id: str
    area_sqm: Optional[float] = None
    land_use: str = "residential"  # residential | commercial | agricultural | industrial
    geometry: Optional[GeoJSONPolygon] = None
    address_hint: Optional[str] = None
    current_owner_refs: List[OwnerRef] = []


class ParcelUpdate(BaseModel):
    geometry: Optional[GeoJSONPolygon] = None
    area_sqm: Optional[float] = None
    land_use: Optional[str] = None
    address_hint: Optional[str] = None
    dispute_state: Optional[str] = None       # none | minor | major
    registration_status: Optional[str] = None  # unregistered | registered | disputed | under_review
