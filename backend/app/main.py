import uuid
from typing import Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import Task, TaskCreate, TaskUpdate, DependencyCreate, DependencySuggestion
from app.graph_engine import DAGEngine, CycleDetectedException
from app.seed_data import get_seed_tasks

app = FastAPI(title="TaskFlow Pro - DAG Workflow Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks_db: Dict[str, Task] = get_seed_tasks()
engine = DAGEngine(tasks_db)
engine.recompute_statuses()

@app.get("/")
def read_root():
    return {"status": "online", "message": "TaskFlow Pro API is running"}

@app.get("/api/tasks", response_model=List[Task])
def get_all_tasks():
    return list(tasks_db.values())

@app.post("/api/tasks", response_model=Task)
def create_task(task_in: TaskCreate):
    task_id = f"TASK-{uuid.uuid4().hex[:6].upper()}"
    new_task = Task(
        id=task_id,
        title=task_in.title,
        description=task_in.description,
        column=task_in.column,
        start_date=task_in.start_date,
        due_date=task_in.due_date,
        duration_days=task_in.duration_days,
        predecessors=[],
        successors=[],
    )
    tasks_db[task_id] = new_task
    engine.recompute_statuses()
    return new_task

@app.patch("/api/tasks/{task_id}", response_model=Task)
def update_task(task_id: str, updates: TaskUpdate):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    task = tasks_db[task_id]
    prev_due = task.due_date
    if updates.title is not None:
        task.title = updates.title
    if updates.description is not None:
        task.description = updates.description
    if updates.column is not None:
        task.column = updates.column
    if updates.start_date is not None:
        task.start_date = updates.start_date
    if updates.due_date is not None:
        task.due_date = updates.due_date
    if updates.duration_days is not None:
        task.duration_days = updates.duration_days

    engine.recompute_statuses()
    if task.due_date != prev_due:
        engine.propagate_schedules(task_id)
    return task

@app.post("/api/dependencies")
def create_dependency(dep: DependencyCreate):
    if dep.predecessor_id not in tasks_db or dep.successor_id not in tasks_db:
        raise HTTPException(status_code=404, detail="One or both tasks not found")
    try:
        engine.add_dependency(dep.predecessor_id, dep.successor_id)
        engine.propagate_schedules(dep.predecessor_id)
        engine.recompute_statuses()
        return {"message": "Dependency established successfully"}
    except CycleDetectedException as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/ai/suggest-dependencies", response_model=List[DependencySuggestion])
def suggest_dependencies():
    suggestions = [
        DependencySuggestion(
            predecessor_id="TASK-4",
            successor_id="TASK-7",
            rationale="Automated Integration Tests should explicitly assert Order Service state flows.",
        )
    ]
    return [s for s in suggestions if not engine.would_create_cycle(s.predecessor_id, s.successor_id)]

@app.post("/api/reset")
def reset_to_seed():
    global tasks_db, engine
    tasks_db = get_seed_tasks()
    engine = DAGEngine(tasks_db)
    engine.recompute_statuses()
    return {"message": "Reset complete"}
