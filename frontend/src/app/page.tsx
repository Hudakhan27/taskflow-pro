
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
  AlertCircle,
  RotateCcw,
  Sparkles,
  Calendar,
  Kanban,
  X,
} from 'lucide-react';

export type ColumnState =
  | 'BACKLOG'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE';

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

const API_BASE = typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:8000` 
  : 'http://127.0.0.1:8000';

const COLUMNS: {
  id: ColumnState;
  title: string;
  accent: string;
}[] = [
  {
    id: 'BACKLOG',
    title: 'Backlog',
    accent: 'bg-pink-300',
  },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    accent: 'bg-pink-400',
  },
  {
    id: 'REVIEW',
    title: 'In Review',
    accent: 'bg-pink-500',
  },
  {
    id: 'DONE',
    title: 'Completed',
    accent: 'bg-pink-600',
  },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<
    DependencySuggestion[]
  >([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks`);

      setTasks(res.data);
      setErrorMessage(null);
    } catch {
      setErrorMessage(
        'Backend service unavailable. Please check port 8000.'
      );
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

    const task = tasks.find((t) => t.id === draggableId);

    if (!task) return;

    const targetColumn = destination.droppableId as ColumnState;

    if (
      task.status === 'BLOCKED' &&
      targetColumn !== 'BACKLOG'
    ) {
      setErrorMessage(
        `Action Blocked: Task "${task.id}" has incomplete upstream dependencies.`
      );
      return;
    }

    const previousTasks = [...tasks];

    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggableId
          ? {
              ...t,
              column: targetColumn,
            }
          : t
      )
    );

    try {
      await axios.patch(
        `${API_BASE}/api/tasks/${draggableId}`,
        {
          column: targetColumn,
        }
      );

      fetchTasks();
    } catch (err: any) {
      setTasks(previousTasks);

      setErrorMessage(
        err.response?.data?.detail ||
          'Failed to update task state.'
      );
    }
  };

  const handleReset = async () => {
    try {
      await axios.post(`${API_BASE}/api/reset`);

      fetchTasks();
      setAiSuggestions([]);
    } catch {
      setErrorMessage('Unable to reset board data.');
    }
  };

  const handleFetchAi = async () => {
    setLoadingAi(true);

    try {
      const res = await axios.get(
        `${API_BASE}/api/ai/suggest-dependencies`
      );

      setAiSuggestions(res.data);
    } catch {
      setErrorMessage(
        'Failed to fetch dependency suggestions.'
      );
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <main className="min-h-screen bg-pink-50 text-black">
      {/* Header */}
      <header className="border-b border-pink-200 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black shadow-sm">
              <Kanban className="h-6 w-6 text-pink-300" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-black">
                TaskFlow Pro
              </h1>

              <p className="text-sm text-pink-500">
                Dependency-Aware DAG Workflow Engine
              </p>
            </div>
          </div>

          {/* Header Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleFetchAi}
              disabled={loadingAi}
              className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-pink-200 shadow-sm transition hover:bg-pink-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />

              {loadingAi
                ? 'Analyzing Graph...'
                : 'Suggestions'}
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm font-semibold text-black transition hover:border-pink-400 hover:bg-pink-100"
            >
              <RotateCcw className="h-4 w-4 text-pink-500" />

              Reset Data
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-6 py-7">
        {/* Error Toast */}
        {errorMessage && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-pink-300 bg-white px-5 py-4 text-pink-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100">
                <AlertCircle className="h-5 w-5 text-pink-600" />
              </div>

              <span className="text-sm font-medium">
                {errorMessage}
              </span>
            </div>

            <button
              onClick={() => setErrorMessage(null)}
              className="rounded-lg p-1 text-pink-500 transition hover:bg-pink-100 hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Suggestions */}
        {aiSuggestions.length > 0 && (
          <section className="mb-7 rounded-3xl border border-pink-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100">
                <Sparkles className="h-5 w-5 text-pink-600" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-black">
                  Recommended Graph Edges
                </h2>

                <p className="text-sm text-pink-500">
                  AI-generated dependency suggestions
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {aiSuggestions.map((s, idx) => (
                <div
                  key={`${s.predecessor_id}-${s.successor_id}-${idx}`}
                  className="rounded-2xl border border-pink-100 bg-pink-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    <span className="rounded-lg bg-black px-3 py-1.5 text-pink-200">
                      {s.predecessor_id}
                    </span>

                    <span className="text-lg font-bold text-pink-500">
                      ➜
                    </span>

                    <span className="rounded-lg bg-black px-3 py-1.5 text-pink-200">
                      {s.successor_id}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {s.rationale}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Kanban Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const columnTasks = tasks.filter(
                (t) => t.column === col.id
              );

              return (
                <section
                  key={col.id}
                  className="min-h-[500px] overflow-hidden rounded-3xl border border-pink-200 bg-white shadow-sm"
                >
                  {/* Column Header */}
                  <div className="border-b border-pink-100 bg-pink-50 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${col.accent}`}
                        />

                        <h3 className="font-bold text-black">
                          {col.title}
                        </h3>
                      </div>

                      <span className="rounded-full bg-black px-2.5 py-1 text-xs font-bold text-pink-200">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Task List */}
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="min-h-[440px] space-y-4 p-4"
                      >
                        {columnTasks.map((task, index) => {
                          const isBlocked =
                            task.status === 'BLOCKED';

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
                                  className="cursor-grab rounded-2xl border border-pink-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-md active:cursor-grabbing"
                                >
                                  {/* Task Top Meta */}
                                  <div className="mb-3 flex items-center justify-between">
                                    <span className="rounded-lg bg-black px-2.5 py-1 text-xs font-bold text-pink-200">
                                      {task.id}
                                    </span>

                                    {isBlocked ? (
                                      <span className="flex items-center gap-1.5 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-semibold text-pink-700">
                                        <Lock className="h-3 w-3" />
                                        Blocked
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-600">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Ready
                                      </span>
                                    )}
                                  </div>

                                  {/* Task Title */}
                                  <h4 className="mb-2 text-base font-bold text-black">
                                    {task.title}
                                  </h4>

                                  {/* Task Description */}
                                  <p className="text-sm leading-6 text-gray-600">
                                    {task.description}
                                  </p>

                                  {/* Task Footer */}
                                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-pink-100 pt-3 text-xs text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-pink-500" />

                                      <span>
                                        {task.due_date}
                                      </span>
                                    </div>

                                    {task.predecessors?.length >
                                      0 && (
                                      <span className="rounded-lg bg-pink-50 px-2 py-1 text-pink-600">
                                        Dep:{' '}
                                        {task.predecessors.join(
                                          ', '
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </article>
                              )}
                            </Draggable>
                          );
                        })}

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
          </div>
        </DragDropContext>
      </div>
    </main>
  );
}