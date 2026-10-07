import { HttpClient, httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  Comment, PRIORITIES, ProjectDetail, STATUSES, STATUS_LABEL, Task,
  dateToUtc, errorMessage, isOverdue, utcToDate,
} from '../api';
import { Auth } from '../auth';
import { StateView } from '../ui';

@Component({
  selector: 'app-task-detail',
  imports: [FormsModule, RouterLink, DatePipe, StateView],
  template: `
    <app-state [loading]="task.isLoading()" [error]="task.error()" />

    @if (task.hasValue()) {
      @let t = task.value();
      <p><a [routerLink]="['/projects', t.projectId]">← {{ t.projectName }}</a></p>
      <h1>{{ t.title }}</h1>
      <p>
        <span class="badge" [attr.data-status]="t.status">{{ label[t.status] }}</span>
        @if (overdue(t)) { <span class="badge overdue">Overdue</span> }
      </p>

      @if (form(); as f) {
        <form class="card form" (ngSubmit)="save()">
          <!-- Managers may edit everything. The assignee may only change the status. Others read only. -->
          <label for="title">Title</label>
          <input id="title" name="title" required maxlength="200" [(ngModel)]="f.title" [disabled]="!canEditAll()" />

          <label for="description">Description</label>
          <textarea id="description" name="description" rows="4" maxlength="4000" [(ngModel)]="f.description" [disabled]="!canEditAll()"></textarea>

          <label for="assignee">Assignee</label>
          <select id="assignee" name="assignee" [(ngModel)]="f.assigneeId" [disabled]="!canEditAll()">
            <option [ngValue]="null" disabled>Unassigned</option>
            @for (m of project.hasValue() ? project.value().members : []; track m.userId) { <option [ngValue]="m.userId">{{ m.name }}</option> }
          </select>

          <label for="status">Status</label>
          <select id="status" name="status" [(ngModel)]="f.status" [disabled]="!canEditStatus()">
            @for (s of statuses; track s) { <option [value]="s">{{ label[s] }}</option> }
          </select>

          <label for="priority">Priority</label>
          <select id="priority" name="priority" [(ngModel)]="f.priority" [disabled]="!canEditAll()">
            @for (p of priorities; track p) { <option [value]="p">{{ p }}</option> }
          </select>

          <label for="due">Due date (UTC)</label>
          <input id="due" name="due" type="date" [(ngModel)]="f.due" [disabled]="!canEditAll()" />

          @if (message(); as m) { <p [class]="m.ok ? 'success' : 'error'" role="status">{{ m.text }}</p> }

          <div class="row">
            @if (canEditStatus()) { <button class="primary" type="submit" [disabled]="busy()">Save changes</button> }
            @if (canEditAll()) { <button class="danger" type="button" (click)="remove()" [disabled]="busy()">Delete task</button> }
          </div>
        </form>
      }

      <h2>Comments</h2>
      <app-state [loading]="comments.isLoading()" [error]="comments.error()"
                 [empty]="comments.hasValue() && !comments.value().length" emptyText="No comments yet." />
      <ol class="timeline">
        @for (c of comments.hasValue() ? comments.value() : []; track c.id) {
          <li>
            <strong>{{ c.authorName }}</strong>
            <span class="muted"> · {{ c.createdAt | date: 'medium' : 'UTC' }} UTC</span>
            <p>{{ c.body }}</p>
          </li>
        }
      </ol>
      <form class="form" (ngSubmit)="addComment()">
        <label for="comment">Add a comment</label>
        <textarea id="comment" name="comment" rows="3" maxlength="2000" [(ngModel)]="newComment"></textarea>
        @if (commentError()) { <p class="error" role="alert">{{ commentError() }}</p> }
        <button type="submit" [disabled]="!newComment.trim()">Post comment</button>
      </form>
    }
  `,
})
export class TaskDetailPage {
  private http = inject(HttpClient);
  private router = inject(Router);
  private auth = inject(Auth);

  id = input.required({ transform: numberAttribute });

  task = httpResource<Task>(() => `/api/tasks/${this.id()}`);
  // Waits for the task, then loads its project (for members list + my role).
  project = httpResource<ProjectDetail>(() =>
    this.task.hasValue() ? `/api/projects/${this.task.value().projectId}` : undefined,
  );
  comments = httpResource<Comment[]>(() => `/api/tasks/${this.id()}/comments`);

  canEditAll = computed(() => this.project.hasValue() && this.project.value().myRole === 'manager');
  canEditStatus = computed(() => this.canEditAll() || (this.task.hasValue() && this.task.value().assigneeId === this.auth.user()?.id));

  // An editable copy of the task. Resets whenever the task is (re)loaded or saved.
  form = linkedSignal(() => {
    const t = this.task.hasValue() ? this.task.value() : undefined;
    return t && {
      title: t.title, description: t.description, assigneeId: t.assigneeId,
      status: t.status, priority: t.priority, due: utcToDate(t.dueAt),
    };
  });

  statuses = STATUSES;
  priorities = PRIORITIES;
  label = STATUS_LABEL;
  overdue = isOverdue;
  busy = signal(false);
  message = signal<{ ok: boolean; text: string } | null>(null);
  newComment = '';
  commentError = signal('');

  async save() {
    const f = this.form()!;
    // Members send only the status; the API would reject anything else with 403 anyway.
    const body = this.canEditAll()
      ? { title: f.title, description: f.description, assigneeId: f.assigneeId, status: f.status,
          priority: f.priority, dueAt: dateToUtc(f.due) }
      : { status: f.status };
    this.busy.set(true);
    try {
      this.task.set(await firstValueFrom(this.http.patch<Task>(`/api/tasks/${this.id()}`, body)));
      this.message.set({ ok: true, text: 'Saved.' });
    } catch (e) {
      this.message.set({ ok: false, text: errorMessage(e) });
    } finally {
      this.busy.set(false);
    }
  }

  async remove() {
    if (!confirm('Delete this task and its comments? This cannot be undone.')) return;
    const projectId = this.task.value()!.projectId;
    try {
      await firstValueFrom(this.http.delete(`/api/tasks/${this.id()}`));
      this.router.navigate(['/projects', projectId]);
    } catch (e) {
      this.message.set({ ok: false, text: errorMessage(e) });
    }
  }

  async addComment() {
    this.commentError.set('');
    try {
      await firstValueFrom(this.http.post(`/api/tasks/${this.id()}/comments`, { body: this.newComment }));
      this.newComment = '';
      this.comments.reload();
    } catch (e) {
      this.commentError.set(errorMessage(e));
    }
  }
}
