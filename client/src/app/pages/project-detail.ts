import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  PRIORITIES, PRIORITY_LABEL, Paged, Priority, ProjectDetail, STATUSES, STATUS_LABEL, Task, TaskStatus, User,
  dateToUtc, errorMessage,
} from '../api';
import { Auth } from '../auth';
import { Avatar, StateView, TaskList } from '../ui';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-project-detail',
  imports: [FormsModule, RouterLink, Avatar, StateView, TaskList],
  template: `
    <app-state [loading]="project.isLoading()" [error]="project.error()" />

    @if (project.hasValue()) {
      @let p = project.value();
      <header class="page-head">
        <div>
          <p class="crumbs"><a routerLink="/projects">Projects</a></p>
          <h1>{{ p.name }}</h1>
          <p class="muted">{{ p.description }}</p>
        </div>
        @if (isManager()) {
          <button class="primary" type="button" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">
            Add task
          </button>
        }
      </header>

      <section class="members" aria-labelledby="members-h">
        <h2 id="members-h" class="label">Members</h2>
        <ul class="chips">
          @for (m of p.members; track m.userId) {
            <li class="chip"><app-avatar [name]="m.name" />{{ m.name }} <span class="role">{{ m.role }}</span></li>
          }
        </ul>
        @if (isManager() && nonMembers().length) {
          <form class="add-member" (ngSubmit)="addMember()">
            <label for="new-member" class="visually-hidden">Add member</label>
            <select id="new-member" name="newMember" [(ngModel)]="newMemberId">
              <option [ngValue]="null">Add a member…</option>
              @for (u of nonMembers(); track u.id) { <option [ngValue]="u.id">{{ u.name }}</option> }
            </select>
            <button type="submit" [disabled]="!newMemberId">Add</button>
          </form>
        }
      </section>

      @if (showForm()) {
        <form class="panel form task-form-new" (ngSubmit)="createTask()">
          <h2>New task</h2>
          <div class="field wide">
            <label for="t-title">Title</label>
            <input id="t-title" name="title" required maxlength="200" [(ngModel)]="draft.title" />
          </div>
          <div class="field">
            <label for="t-assignee">Assignee</label>
            <select id="t-assignee" name="assignee" [(ngModel)]="draft.assigneeId">
              <option [ngValue]="null">Unassigned</option>
              @for (m of p.members; track m.userId) { <option [ngValue]="m.userId">{{ m.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="t-priority">Priority</label>
            <select id="t-priority" name="priority" [(ngModel)]="draft.priority">
              @for (pr of priorities; track pr) { <option [value]="pr">{{ priorityLabel[pr] }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="t-due">Due date (UTC)</label>
            <input id="t-due" name="due" type="date" [(ngModel)]="draft.due" />
          </div>
          <div class="actions wide">
            <button class="primary" type="submit" [disabled]="busy()">Create task</button>
            <button type="button" (click)="showForm.set(false)">Cancel</button>
          </div>
        </form>
      }

      @if (message()) { <p class="error" role="alert">{{ message() }}</p> }

      <div class="section-head">
        <h2>Tasks</h2>
        <div class="filters">
          <label for="f-status">Status</label>
          <select id="f-status" [ngModel]="status()" (ngModelChange)="status.set($event); page.set(1)">
            <option value="">All</option>
            @for (s of statuses; track s) { <option [value]="s">{{ label[s] }}</option> }
          </select>
          <label class="check"><input type="checkbox" [ngModel]="mine()" (ngModelChange)="mine.set($event); page.set(1)" /> Only my tasks</label>
        </div>
      </div>

      <app-state [loading]="tasks.isLoading()" [error]="tasks.error()"
                 [empty]="tasks.hasValue() && !tasks.value().items.length" emptyText="No tasks match these filters." />
      @if (tasks.hasValue() && tasks.value().items.length) {
        <app-task-list [tasks]="tasks.value().items" />
        <nav class="pager" aria-label="Pages">
          <span class="muted">Page {{ page() }} of {{ pageCount() }}</span>
          <button type="button" (click)="page.set(page() - 1)" [disabled]="page() === 1">Previous</button>
          <button type="button" (click)="page.set(page() + 1)" [disabled]="page() >= pageCount()">Next</button>
        </nav>
      }
    }
  `,
})
export class ProjectDetailPage {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  id = input.required({ transform: numberAttribute }); // from the :id route param

  project = httpResource<ProjectDetail>(() => `/api/projects/${this.id()}`);
  isManager = computed(() => this.project.hasValue() && this.project.value().myRole === 'manager');

  // Filters. Changing any signal here makes the tasks resource fetch again.
  status = signal<TaskStatus | ''>('');
  mine = signal(false);
  page = signal(1);
  tasks = httpResource<Paged<Task>>(() => {
    const params: Record<string, string | number> = { page: this.page(), pageSize: PAGE_SIZE };
    if (this.status()) params['status'] = this.status();
    if (this.mine()) params['assignee'] = this.auth.user()!.id;
    return { url: `/api/projects/${this.id()}/tasks`, params };
  });
  pageCount = computed(() => Math.max(1, Math.ceil((this.tasks.hasValue() ? this.tasks.value().total : 0) / PAGE_SIZE)));

  // Only loaded for managers (undefined = don't fetch).
  users = httpResource<User[]>(() => (this.isManager() ? '/api/users' : undefined));
  nonMembers = computed(() => {
    const memberIds = new Set(this.project.hasValue() ? this.project.value().members.map((m) => m.userId) : []);
    return (this.users.hasValue() ? this.users.value() : []).filter((u) => !memberIds.has(u.id));
  });

  statuses = STATUSES;
  priorities = PRIORITIES;
  priorityLabel = PRIORITY_LABEL;
  label = STATUS_LABEL;
  showForm = signal(false);
  busy = signal(false);
  message = signal('');
  newMemberId: number | null = null;
  draft = { title: '', assigneeId: null as number | null, priority: 'normal' as Priority, due: '' };

  async addMember() {
    await this.run(async () => {
      await firstValueFrom(this.http.post(`/api/projects/${this.id()}/members`, { userId: this.newMemberId }));
      this.newMemberId = null;
      this.project.reload();
    });
  }

  async createTask() {
    if (!this.draft.title.trim()) {
      this.message.set('Please give the task a title.');
      return;
    }
    await this.run(async () => {
      const { title, assigneeId, priority, due } = this.draft;
      await firstValueFrom(
        this.http.post(`/api/projects/${this.id()}/tasks`, { title, assigneeId, priority, dueAt: dateToUtc(due) }),
      );
      this.draft = { title: '', assigneeId: null, priority: 'normal', due: '' };
      this.showForm.set(false);
      this.tasks.reload();
    });
  }

  // Shared busy/error handling for the two forms above.
  private async run(action: () => Promise<void>) {
    this.busy.set(true);
    this.message.set('');
    try {
      await action();
    } catch (e) {
      this.message.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
