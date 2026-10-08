import { httpResource } from '@angular/common/http';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dashboard } from '../api';
import { StateView, TaskList } from '../ui';

const CARDS = [
  { bucket: 'open', key: 'open', label: 'Open' },
  { bucket: 'due_soon', key: 'dueSoon', label: 'Due in 7 days' },
  { bucket: 'overdue', key: 'overdue', label: 'Overdue' },
  { bucket: 'completed', key: 'completedThisMonth', label: 'Completed this month' },
] as const;

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StateView, TaskList],
  template: `
    <header class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">Work across every project you belong to.</p>
      </div>
    </header>

    <nav class="stats" aria-label="Task summary">
      @for (c of cards; track c.bucket) {
        <!-- Each card is a link that filters the list below via ?bucket= -->
        <a class="stat" [routerLink]="[]" [queryParams]="{ bucket: c.bucket }" [attr.data-bucket]="c.bucket"
           [attr.aria-current]="bucket() === c.bucket ? 'true' : null">
          <span class="stat-label">{{ c.label }}</span>
          <span class="stat-num">{{ summary.hasValue() ? summary.value()[c.key] : '–' }}</span>
        </a>
      }
    </nav>

    <div class="section-head">
      <h2>{{ title() }}</h2>
      @if (bucket()) { <a routerLink="/">Show recent</a> }
    </div>

    <app-state [loading]="summary.isLoading()" [error]="summary.error()"
               [empty]="summary.hasValue() && !summary.value().tasks.length" emptyText="No tasks here. Nice." />
    @if (summary.hasValue() && summary.value().tasks.length) {
      <app-task-list [tasks]="summary.value().tasks" showProject />
    }
  `,
})
export class DashboardPage {
  bucket = input<string>(); // ?bucket=overdue, bound by withComponentInputBinding
  cards = CARDS;

  // Re-fetches automatically whenever bucket() changes.
  // Note: a resource's value() throws while it is in an error state, so templates check hasValue() first.
  summary = httpResource<Dashboard>(() => ({
    url: '/api/dashboard/summary',
    params: { bucket: this.bucket() ?? '' }, // '' = no filter
  }));

  title = computed(() => CARDS.find((c) => c.bucket === this.bucket())?.label ?? 'Recently updated');
}
