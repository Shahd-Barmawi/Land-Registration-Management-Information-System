from pydantic import BaseModel
from typing import Optional, List


# Full model implemented by Module 3
class StaffCreate(BaseModel):
    name: str
    role: str  # surveyor | registrar
    department: Optional[str] = None
    skills: List[str] = []
    zone_ids: List[str] = []
    email: Optional[str] = None
    phone: Optional[str] = None
    max_tasks: int = 10
