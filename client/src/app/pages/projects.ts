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
    <div class="row between">
      <h1>Projects</h1>
      <button class="primary" type="button" (click)="showForm.set(!showForm())" [attr.aria-expanded]="showForm()">
        New project
      </button>
    </div>

    @if (showForm()) {
      <form class="card form" (ngSubmit)="create()">
        <label for="p-name">Name</label>
        <input id="p-name" name="name" required maxlength="100" [(ngModel)]="name" />
        <label for="p-desc">Description</label>
        <textarea id="p-desc" name="description" maxlength="1000" rows="3" [(ngModel)]="description"></textarea>
        @if (formError()) { <p class="error" role="alert">{{ formError() }}</p> }
        <div class="row">
          <button class="primary" type="submit" [disabled]="busy()">Create project</button>
          <button type="button" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    }

    <label for="search" class="visually-hidden">Search projects</label>
    <input id="search" type="search" placeholder="Search projects…" [ngModel]="search()" (ngModelChange)="search.set($event)" />

    <app-state [loading]="projects.isLoading()" [error]="projects.error()"
               [empty]="projects.hasValue() && !filtered().length" emptyText="No projects found." />

    <ul class="project-list">
      @for (p of filtered(); track p.id) {
        <li class="card">
          <h2><a [routerLink]="['/projects', p.id]">{{ p.name }}</a></h2>
          <p class="muted">{{ p.description }}</p>
          <p>{{ p.memberCount }} members · {{ p.doneCount }}/{{ p.taskCount }} tasks done</p>
          <progress [value]="p.doneCount" [max]="p.taskCount || 1" [attr.aria-label]="p.name + ' progress'"></progress>
        </li>
      }
    </ul>
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
