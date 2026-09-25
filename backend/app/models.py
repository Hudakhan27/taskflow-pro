from enum import Enum
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field

class ColumnState(str, Enum):
    BACKLOG = "BACKLOG"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    DONE = "DONE"

class TaskStatus(str, Enum):
    READY = "READY"
    BLOCKED = "BLOCKED"

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    column: ColumnState = ColumnState.BACKLOG
    start_date: date
    due_date: date
    duration_days: int = Field(default=1, ge=1)

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    column: Optional[ColumnState] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    duration_days: Optional[int] = None

class Task(TaskBase):
    id: str
    status: TaskStatus = TaskStatus.READY
    predecessors: List[str] = []
    successors: List[str] = []

class DependencyCreate(BaseModel):
    predecessor_id: str
    successor_id: str

class DependencySuggestion(BaseModel):
    predecessor_id: str
    successor_id: str
    rationale: str
