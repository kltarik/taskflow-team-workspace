import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DemoInfo } from './api';
import { Auth } from './auth';
import { Avatar } from './ui';

// The app shell: sidebar (only when logged in; a top bar on phones) + the current page.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, Avatar],
  template: `
    <div class="shell" [class.signed-in]="auth.user()">
      @if (auth.user(); as user) {
        <aside class="sidebar">
          <a class="brand" routerLink="/">
            <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>
            TaskFlow
          </a>
          <nav aria-label="Main">
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="dashboardMatch">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
              Dashboard
            </a>
            <a routerLink="/projects" routerLinkActive="active">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
              Projects
            </a>
            <a routerLink="/settings" routerLinkActive="active">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
              Settings
            </a>
          </nav>
          <div class="me">
            <app-avatar [name]="user.name" />
            <span class="me-text"><strong>{{ user.name }}</strong><small>{{ user.demoRole }}</small></span>
            <button class="ghost icon-btn" type="button" (click)="logout()" title="Sign out">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              <span class="visually-hidden">Sign out</span>
            </button>
          </div>
        </aside>
      }
      <div class="content">
        <!-- Public demo: visitors are told their changes are temporary. Hidden when reset is off. -->
        @if (demo.hasValue() && demo.value().resetMinutes > 0) {
          <p class="demo-banner" role="note">
            <strong>Demo workspace.</strong> All changes are reset every {{ demo.value().resetMinutes }} minutes@if (demo.value().nextResetAt; as next) {, next at {{ next | date: 'HH:mm' : 'UTC' }} UTC}.
          </p>
        }
        <main class="page">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class App {
  protected auth = inject(Auth);
  protected demo = httpResource<DemoInfo>(() => '/api/demo');
  private router = inject(Router);
  // Dashboard stays highlighted while a ?bucket= filter is applied.
  protected dashboardMatch: IsActiveMatchOptions = { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' };

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
