from datetime import date, timedelta
from typing import Dict, List, Set
from app.models import Task, ColumnState, TaskStatus

class CycleDetectedException(Exception):
    pass

class DAGEngine:
    def __init__(self, tasks: Dict[str, Task]):
        self.tasks = tasks

    def would_create_cycle(self, predecessor_id: str, successor_id: str) -> bool:
        if predecessor_id == successor_id:
            return True
        visited: Set[str] = set()
        stack = [successor_id]
        while stack:
            current = stack.pop()
            if current == predecessor_id:
                return True
            if current not in visited:
                visited.add(current)
                if current in self.tasks:
                    stack.extend(self.tasks[current].successors)
        return False

    def add_dependency(self, predecessor_id: str, successor_id: str):
        if predecessor_id not in self.tasks or successor_id not in self.tasks:
            raise ValueError("Both tasks must exist")
        if self.would_create_cycle(predecessor_id, successor_id):
            raise CycleDetectedException(
                f"Cannot add dependency: {predecessor_id} -> {successor_id} creates a circular dependency."
            )
        if predecessor_id not in self.tasks[successor_id].predecessors:
            self.tasks[successor_id].predecessors.append(predecessor_id)
        if successor_id not in self.tasks[predecessor_id].successors:
            self.tasks[predecessor_id].successors.append(successor_id)

    def recompute_statuses(self):
        for task in self.tasks.values():
            if not task.predecessors:
                task.status = TaskStatus.READY
            else:
                all_done = all(
                    self.tasks[p_id].column == ColumnState.DONE
                    for p_id in task.predecessors
                    if p_id in self.tasks
                )
                task.status = TaskStatus.READY if all_done else TaskStatus.BLOCKED

    def propagate_schedules(self, root_task_id: str):
        downstream_nodes: Set[str] = set()
        queue = [root_task_id]
        while queue:
            curr = queue.pop(0)
            for succ in self.tasks[curr].successors:
                if succ not in downstream_nodes:
                    downstream_nodes.add(succ)
                    queue.append(succ)

        if not downstream_nodes:
            return

        subgraph = downstream_nodes.copy()
        in_degree = {node: 0 for node in subgraph}
        for node in subgraph:
            for pred in self.tasks[node].predecessors:
                if pred in subgraph:
                    in_degree[node] += 1

        ready_queue = [node for node in subgraph if in_degree[node] == 0]
        topo_order = []
        while ready_queue:
            curr = ready_queue.pop(0)
            topo_order.append(curr)
            for succ in self.tasks[curr].successors:
                if succ in in_degree:
                    in_degree[succ] -= 1
                    if in_degree[succ] == 0:
                        ready_queue.append(succ)

        for task_id in topo_order:
            task = self.tasks[task_id]
            if not task.predecessors:
                continue
            max_pred_due = max(
                self.tasks[p_id].due_date
                for p_id in task.predecessors
                if p_id in self.tasks
            )
            if task.start_date < max_pred_due:
                delta = (max_pred_due - task.start_date).days
                task.start_date = max_pred_due
                task.due_date = task.due_date + timedelta(days=delta)
