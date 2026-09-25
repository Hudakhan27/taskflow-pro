export type ColumnState = 'BACKLOG' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskStatus = 'READY' | 'BLOCKED';

export interface Task {
  id: string;
  title: string;
  description: string;
  column: ColumnState;
  status: TaskStatus;
  start_date: string;
  due_date: string;
  duration_days: number;
  predecessors: string[];
  successors: string[];
}

export interface DependencySuggestion {
  predecessor_id: string;
  successor_id: string;
  rationale: string;
}