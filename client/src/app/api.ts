import { HttpErrorResponse } from '@angular/common/http';

// TypeScript mirrors of the C# DTOs in server/TaskFlow.Api/Dtos.cs. Keep the two in sync.

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type Priority = 'low' | 'normal' | 'high';
export type Role = 'manager' | 'member';

export interface Me { id: number; name: string; email: string; demoRole: Role; }
export interface User { id: number; name: string; }
export interface ProjectSummary {
  id: number; name: string; description: string; memberCount: number; taskCount: number; doneCount: number;
}
export interface Member { userId: number; name: string; role: Role; }
export interface ProjectDetail { id: number; name: string; description: string; myRole: Role; members: Member[]; }
export interface Task {
  id: number; projectId: number; projectName: string; title: string; description: string;
  assigneeId: number | null; assigneeName: string | null; status: TaskStatus; priority: Priority;
  dueAt: string | null; createdAt: string; updatedAt: string;
}
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; }
export interface Comment { id: number; authorId: number; authorName: string; body: string; createdAt: string; }
export interface DemoInfo { resetMinutes: number; nextResetAt: string | null; }
export interface Dashboard { open: number; dueSoon: number; overdue: number; completedThisMonth: number; tasks: Task[]; }

export const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
export const PRIORITIES: Priority[] = ['low', 'normal', 'high'];
export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', done: 'Done',
};

export const isOverdue = (t: Task) => t.status !== 'done' && !!t.dueAt && new Date(t.dueAt) < new Date();

// Dates are stored in UTC and shown in UTC. <input type="date"> gives "2026-10-01";
// a task due that day is due at the end of it.
export const dateToUtc = (day: string) => (day ? `${day}T23:59:59Z` : null);
export const utcToDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

// Turns any API error (ProblemDetails JSON) into one sentence a person can read.
export function errorMessage(err: unknown): string {
  const body = (err as HttpErrorResponse)?.error;
  if (body?.errors) return Object.values(body.errors).flat().join(' ');
  if ((err as HttpErrorResponse)?.status === 0) return 'Cannot reach the server. Is the API running?';
  return body?.detail ?? body?.title ?? 'Something went wrong. Please try again.';
}
