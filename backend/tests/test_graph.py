from datetime import date
from app.models import Task, ColumnState, TaskStatus
from app.graph_engine import DAGEngine, CycleDetectedException

def test_cycle_detection():
    tasks = {
        "A": Task(id="A", title="A", start_date=date(2026, 1, 1), due_date=date(2026, 1, 2), successors=["B"]),
        "B": Task(id="B", title="B", start_date=date(2026, 1, 2), due_date=date(2026, 1, 3), predecessors=["A"], successors=["C"]),
        "C": Task(id="C", title="C", start_date=date(2026, 1, 3), due_date=date(2026, 1, 4), predecessors=["B"]),
    }
    engine = DAGEngine(tasks)
    assert engine.would_create_cycle("C", "A") is True
    try:
        engine.add_dependency("C", "A")
        assert False
    except CycleDetectedException:
        pass

def test_no_compounding_diamond():
    tasks = {
        "A": Task(id="A", title="A", start_date=date(2026, 1, 1), due_date=date(2026, 1, 4), successors=["B", "C"]),
        "B": Task(id="B", title="B", start_date=date(2026, 1, 4), due_date=date(2026, 1, 8), duration_days=4, predecessors=["A"], successors=["D"]),
        "C": Task(id="C", title="C", start_date=date(2026, 1, 4), due_date=date(2026, 1, 8), duration_days=4, predecessors=["A"], successors=["D"]),
        "D": Task(id="D", title="D", start_date=date(2026, 1, 8), due_date=date(2026, 1, 11), duration_days=3, predecessors=["B", "C"]),
    }
    engine = DAGEngine(tasks)
    tasks["A"].due_date = date(2026, 1, 7)
    engine.propagate_schedules("A")
    assert tasks["B"].start_date == date(2026, 1, 7)
    assert tasks["C"].start_date == date(2026, 1, 7)
    assert tasks["D"].start_date == date(2026, 1, 11)

def test_rollback_on_regression():
    tasks = {
        "A": Task(id="A", title="A", column=ColumnState.DONE, start_date=date(2026, 1, 1), due_date=date(2026, 1, 2), successors=["B"]),
        "B": Task(id="B", title="B", column=ColumnState.BACKLOG, start_date=date(2026, 1, 2), due_date=date(2026, 1, 4), predecessors=["A"]),
    }
    engine = DAGEngine(tasks)
    engine.recompute_statuses()
    assert tasks["B"].status == TaskStatus.READY
    tasks["A"].column = ColumnState.IN_PROGRESS
    engine.recompute_statuses()
    assert tasks["B"].status == TaskStatus.BLOCKED
