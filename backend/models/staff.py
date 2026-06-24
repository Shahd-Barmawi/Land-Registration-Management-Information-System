from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ShiftItem(BaseModel):
    day: str    # Mon | Tue | Wed | Thu | Fri | Sat | Sun
    start: str  # HH:MM
    end: str    # HH:MM


class StaffCreate(BaseModel):
    name: str
    role: str                               # surveyor | registrar
    department: Optional[str] = None
    skills: List[str] = []
    zone_ids: List[str] = []
    geo_fence: Optional[Dict[str, Any]] = None  # GeoJSON Polygon
    shifts: List[ShiftItem] = []
    on_call: bool = False
    max_tasks: int = 10
    email: Optional[str] = None
    phone: Optional[str] = None
    active: bool = True
