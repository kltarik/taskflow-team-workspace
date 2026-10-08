import { HttpErrorResponse } from '@angular/common/http';
import { Task, dateToUtc, errorMessage, isOverdue, utcToDate } from './api';

const task = (overrides: Partial<Task>): Task => ({
  id: 1, projectId: 1, projectName: 'P', title: 'T', description: '', assigneeId: null, assigneeName: null,
  status: 'todo', priority: 'normal', dueAt: null, createdAt: '', updatedAt: '', ...overrides,
});

describe('isOverdue', () => {
  it('is true for an open task due in the past', () => {
    expect(isOverdue(task({ dueAt: '2000-01-01T00:00:00Z' }))).toBe(true);
  });
  it('is false once the task is done', () => {
    expect(isOverdue(task({ dueAt: '2000-01-01T00:00:00Z', status: 'done' }))).toBe(false);
  });
  it('is false without a due date or with a future one', () => {
    expect(isOverdue(task({ dueAt: null }))).toBe(false);
    expect(isOverdue(task({ dueAt: '2999-01-01T00:00:00Z' }))).toBe(false);
  });
});

describe('date helpers', () => {
  it('turns a picked day into the end of that day in UTC, and back', () => {
    expect(dateToUtc('2026-10-01')).toBe('2026-10-01T23:59:59Z');
    expect(utcToDate('2026-10-01T23:59:59Z')).toBe('2026-10-01');
  });
  it('treats an empty value as "no date"', () => {
    expect(dateToUtc('')).toBeNull();
    expect(utcToDate(null)).toBe('');
  });
});

describe('errorMessage', () => {
  const http = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('uses the ProblemDetails detail', () => {
    expect(errorMessage(http(403, { title: 'Forbidden', detail: 'Only a manager can create tasks.' })))
      .toBe('Only a manager can create tasks.');
  });
  it('joins validation errors into one sentence', () => {
    expect(errorMessage(http(400, { errors: { Email: ['Email is required.'], Password: ['Password is required.'] } })))
      .toBe('Email is required. Password is required.');
  });
  it('explains when the server cannot be reached', () => {
    expect(errorMessage(http(0, null))).toBe('Cannot reach the server. Is the API running?');
  });
  it('falls back to a generic message', () => {
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
