'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  X,
} from 'lucide-react';

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

const API_BASE = 'http://127.0.0.1:8000';

const COLUMNS: { id: ColumnState; title: string; color: string }[] = [
  { id: 'BACKLOG', title: 'Backlog', color: 'border-slate-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-500' },
  { id: 'REVIEW', title: 'Review', color: 'border-amber-500' },
  { id: 'DONE', title: 'Done', color: 'border-emerald-500' },
];

const formatDate = (dateString: string) => {
  if (!dateString) return '—';

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<DependencySuggestion[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await axios.get<Task[]>(`${API_BASE}/api/tasks`);
      setTasks(res.data);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Backend server offline hai. Port 8000 check karein.');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find((item) => item.id === draggableId);
    if (!task) return;

    const targetColumn = destination.droppableId as ColumnState;

    if (task.status === 'BLOCKED' && targetColumn !== 'BACKLOG') {
      setErrorMessage(
        `Action Blocked: "${task.id}" ke direct predecessors complete nahi hue hain.`
      );
      return;
    }

    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((item) =>
        item.id === draggableId ? { ...item, column: targetColumn } : item
      )
    );

    try {
      await axios.patch(`${API_BASE}/api/tasks/${draggableId}`, {
        column: targetColumn,
      });
      await fetchTasks();
    } catch (err: any) {
      setTasks(previousTasks);
      setErrorMessage(
        err.response?.data?.detail || 'Status update karne me error aaya.'
      );
    }
  };

  const handleReset = async () => {
    try {
      await axios.post(`${API_BASE}/api/reset`);
      await fetchTasks();
      setAiSuggestions([]);
    } catch {
      setErrorMessage('Reset fail ho gaya.');
    }
  };

  const handleFetchAi = async () => {
    setLoadingAi(true);
    try {
      const res = await axios.get<DependencySuggestion[]>(
        `${API_BASE}/api/ai/suggest-dependencies`
      );
      setAiSuggestions(res.data);
    } catch {
      setErrorMessage('AI suggestions fetch nahi ho paye.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              <Layers className="h-4 w-4" />
              TaskFlow Pro
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Dependency-Aware DAG Kanban Engine
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleFetchAi}
              disabled={loadingAi}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAi ? (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  AI Suggestions
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Seed
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 transition hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {aiSuggestions.length > 0 && (
          <section className="mb-8 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-5 shadow-lg shadow-cyan-950/20">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-cyan-200">
              <Sparkles className="h-5 w-5" />
              Recommended Graph Dependencies
            </div>

            <div className="space-y-3">
              {aiSuggestions.map((suggestion, idx) => (
                <div
                  key={`${suggestion.predecessor_id}-${suggestion.successor_id}-${idx}`}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 p-3"
                >
                  <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-200">
                    <span className="rounded bg-slate-800 px-2 py-1 text-cyan-300">
                      {suggestion.predecessor_id}
                    </span>
                    <span className="text-cyan-400">➔</span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-violet-300">
                      {suggestion.successor_id}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{suggestion.rationale}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-5 lg:grid-cols-4">
            {COLUMNS.map((col) => {
              const columnTasks = tasks.filter((task) => task.column === col.id);

              return (
                <div
                  key={col.id}
                  className={`rounded-2xl border bg-slate-900/70 p-3 shadow-lg shadow-slate-950/40 ${col.color}`}
                >
                  <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-lg font-semibold text-white">{col.title}</h2>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                      {columnTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex min-h-[320px] flex-col gap-3"
                      >
                        {columnTasks.map((task, index) => {
                          const isBlocked = task.status === 'BLOCKED';

                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(dragProvided) => (
                                <article
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={dragProvided.draggableProps.style}
                                  className="rounded-xl border border-slate-700 bg-slate-950/80 p-3 shadow-sm transition hover:border-slate-500"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                      {task.id}
                                    </span>
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                        isBlocked
                                          ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
                                          : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                      }`}
                                    >
                                      {isBlocked ? (
                                        <>
                                          <Lock className="h-3 w-3" />
                                          Blocked
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-3 w-3" />
                                          Ready
                                        </>
                                      )}
                                    </span>
                                  </div>

                                  <h3 className="mb-2 text-base font-semibold text-white">
                                    {task.title}
                                  </h3>

                                  <p className="mb-3 text-sm leading-relaxed text-slate-300">
                                    {task.description}
                                  </p>

                                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{formatDate(task.due_date)}</span>
                                  </div>

                                  {task.predecessors?.length > 0 && (
                                    <div className="text-xs text-slate-400">
                                      <span className="font-medium text-slate-300">
                                        Dep:{' '}
                                      </span>
                                      {task.predecessors.join(', ')}
                                    </div>
                                  )}
                                </article>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </main>
  );
}
