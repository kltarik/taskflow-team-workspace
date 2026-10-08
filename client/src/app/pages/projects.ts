import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProjectSummary, errorMessage } from '../api';
import { StateView } from '../ui';

@Component({
  selector: 'app-projects',
  imports: [FormsModule, RouterLink, StateView],
  template: `
    <header class="page-head">
      <div>
        <h1>Projects</h1>
        <p class="muted">Projects you are a member of.</p>
      </div>
      <button class="primary" type="button" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">
        New project
      </button>
    </header>

    @if (showForm()) {
      <form class="panel form" (ngSubmit)="create()">
        <div class="field">
          <label for="p-name">Name</label>
          <input id="p-name" name="name" required maxlength="100" [(ngModel)]="name" />
        </div>
        <div class="field">
          <label for="p-desc">Description <span class="muted">(optional)</span></label>
          <textarea id="p-desc" name="description" maxlength="1000" rows="3" [(ngModel)]="description"></textarea>
        </div>
        @if (formError()) { <p class="error" role="alert">{{ formError() }}</p> }
        <div class="actions">
          <button class="primary" type="submit" [disabled]="busy()">Create project</button>
          <button type="button" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <div class="toolbar">
      <label for="search" class="visually-hidden">Search projects</label>
      <input id="search" class="search" type="search" placeholder="Search projects…" [ngModel]="search()" (ngModelChange)="search.set($event)" />
    </div>

    <app-state [loading]="projects.isLoading()" [error]="projects.error()"
               [empty]="projects.hasValue() && !filtered().length" emptyText="No projects found." />

    @if (filtered().length) {
      <ul class="project-list">
        @for (p of filtered(); track p.id) {
          <li>
            <div class="project-main">
              <h2><a [routerLink]="['/projects', p.id]">{{ p.name }}</a></h2>
              <p class="muted">{{ p.description }}</p>
            </div>
            <p class="project-meta muted">{{ p.memberCount }} {{ p.memberCount === 1 ? 'member' : 'members' }}</p>
            <div class="project-progress">
              <span class="num">{{ p.doneCount }}/{{ p.taskCount }} done</span>
              <progress [value]="p.doneCount" [max]="p.taskCount || 1" [attr.aria-label]="p.name + ' progress'"></progress>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class ProjectsPage {
  private http = inject(HttpClient);
  private router = inject(Router);

  projects = httpResource<ProjectSummary[]>(() => '/api/projects');
  search = signal('');
  // The list is small, so search runs in the browser; no API parameter needed.
  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return (this.projects.hasValue() ? this.projects.value() : []).filter((p) => p.name.toLowerCase().includes(q));
  });

  showForm = signal(false);
  name = '';
  description = '';
  busy = signal(false);
  formError = signal('');

  async create() {
    if (!this.name.trim()) {
      this.formError.set('Please give the project a name.');
      return;
    }
    this.busy.set(true);
    this.formError.set('');
    try {
      const p = await firstValueFrom(
        this.http.post<ProjectSummary>('/api/projects', { name: this.name, description: this.description }),
      );
      this.router.navigate(['/projects', p.id]);
    } catch (e) {
      this.formError.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
