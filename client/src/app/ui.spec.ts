import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Task } from './api';
import { StateView, TaskList } from './ui';

const task = (overrides: Partial<Task>): Task => ({
  id: 1, projectId: 1, projectName: 'Website Relaunch', title: 'Write copy', description: '', assigneeId: null,
  assigneeName: null, status: 'todo', priority: 'normal', dueAt: null, createdAt: '', updatedAt: '', ...overrides,
});

describe('TaskList', () => {
  async function render(tasks: Task[], showProject = false) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(TaskList);
    fixture.componentRef.setInput('tasks', tasks);
    fixture.componentRef.setInput('showProject', showProject);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks overdue tasks with text, not only color', async () => {
    const el = await render([task({ dueAt: '2000-01-01T00:00:00Z' })]);
    expect(el.querySelector('tbody tr')!.classList).toContain('is-overdue');
    expect(el.querySelector('.badge.overdue')!.textContent).toContain('Overdue');
  });

  it('shows readable status, "Unassigned", a link to the task and the UTC due date', async () => {
    const el = await render([task({ id: 7, status: 'in_progress', dueAt: '2999-03-04T12:00:00Z' })]);
    expect(el.querySelector('[data-label="Status"]')!.textContent).toContain('In progress');
    expect(el.querySelector('[data-label="Assignee"]')!.textContent).toContain('Unassigned');
    expect(el.querySelector('a')!.getAttribute('href')).toBe('/tasks/7');
    expect(el.querySelector('[data-label="Due"]')!.textContent).toContain('Mar 4, 2999');
    expect(el.querySelector('.badge.overdue')).toBeNull();
  });

  it('adds the project column only when asked', async () => {
    expect((await render([task({})])).querySelector('[data-label="Project"]')).toBeNull();
    TestBed.resetTestingModule();
    expect((await render([task({})], true)).querySelector('[data-label="Project"]')!.textContent).toContain('Website Relaunch');
  });
});

describe('StateView', () => {
  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(StateView);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent!.trim();
  }

  it('shows loading, then error, then empty text', async () => {
    expect(await render({ loading: true })).toBe('Loading…');
    expect(await render({ error: new HttpErrorResponse({ status: 404, error: { detail: 'Project not found.' } }) }))
      .toBe('Project not found.');
    expect(await render({ empty: true, emptyText: 'No tasks yet.' })).toBe('No tasks yet.');
    expect(await render({})).toBe('');
  });
});
