import { DatePipe } from '@angular/common';
import { Component, booleanAttribute, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { STATUS_LABEL, Task, errorMessage, isOverdue } from './api';

// Initials in a tinted circle. The hue comes from the name, so a person keeps the same color everywhere.
// Decorative only: the name is always written next to it.
@Component({
  selector: 'app-avatar',
  host: { class: 'avatar', 'aria-hidden': 'true', '[style.--hue]': 'hue()' },
  template: `{{ initials() }}`,
})
export class Avatar {
  name = input.required<string>();
  initials = computed(() => this.name().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase());
  hue = computed(() => [...this.name()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7));
}

// Shared loading / error / empty message, so every page handles those states the same way.
@Component({
  selector: 'app-state',
  template: `
    @if (loading()) {
      <p class="state" role="status"><span class="spinner" aria-hidden="true"></span>Loading…</p>
    } @else if (error()) {
      <p class="state error" role="alert">{{ message(error()) }}</p>
    } @else if (empty()) {
      <p class="state">{{ emptyText() }}</p>
    }
  `,
})
export class StateView {
  loading = input(false);
  error = input<unknown>();
  empty = input(false);
  emptyText = input('Nothing here yet.');
  message = errorMessage;
}

// Task table. On narrow screens CSS turns each row into a stacked card (see styles.css).
@Component({
  selector: 'app-task-list',
  imports: [RouterLink, DatePipe, Avatar],
  template: `
    <div class="table-panel">
      <table class="tasks">
        <thead>
          <tr>
            <th scope="col">Task</th>
            @if (showProject()) { <th scope="col">Project</th> }
            <th scope="col">Assignee</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Due (UTC)</th>
          </tr>
        </thead>
        <tbody>
          @for (t of tasks(); track t.id) {
            <tr [class.is-overdue]="overdue(t)">
              <td data-label="Task"><a class="task-link" [routerLink]="['/tasks', t.id]">{{ t.title }}</a></td>
              @if (showProject()) { <td data-label="Project" class="muted">{{ t.projectName }}</td> }
              <td data-label="Assignee">
                @if (t.assigneeName; as name) {
                  <span class="person"><app-avatar [name]="name" />{{ name }}</span>
                } @else {
                  <span class="muted">Unassigned</span>
                }
              </td>
              <td data-label="Status"><span class="badge" [attr.data-status]="t.status">{{ label[t.status] }}</span></td>
              <td data-label="Priority">
                <span class="priority" [attr.data-priority]="t.priority"><i></i><i></i><i></i>{{ t.priority }}</span>
              </td>
              <td data-label="Due" class="due">
                <span class="num">{{ t.dueAt ? (t.dueAt | date: 'mediumDate' : 'UTC') : '—' }}</span>
                <!-- Overdue is spelled out in text, not shown by color alone. -->
                @if (overdue(t)) { <span class="badge overdue">Overdue</span> }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TaskList {
  tasks = input.required<Task[]>();
  showProject = input(false, { transform: booleanAttribute });
  overdue = isOverdue;
  label = STATUS_LABEL;
}
