import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DemoInfo } from './api';
import { Auth } from './auth';

// The app shell: top bar (only when logged in) + the current page.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  template: `
    @if (auth.user(); as user) {
      <header class="topbar">
        <a class="brand" routerLink="/">TaskFlow</a>
        <nav aria-label="Main">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/projects" routerLinkActive="active">Projects</a>
          <a routerLink="/settings" routerLinkActive="active">Settings</a>
        </nav>
        <span class="who">{{ user.name }} · {{ user.demoRole }}</span>
        <button type="button" (click)="logout()">Sign out</button>
      </header>
    }
    <!-- Public demo: visitors are told their changes are temporary. Hidden when reset is off. -->
    @if (demo.hasValue() && demo.value().resetMinutes > 0) {
      <p class="demo-banner" role="note">
        Demo workspace: all changes are reset every {{ demo.value().resetMinutes }} minutes@if (demo.value().nextResetAt; as next) {, next at {{ next | date: 'HH:mm' : 'UTC' }} UTC}.
      </p>
    }
    <main class="page">
      <router-outlet />
    </main>
  `,
})
export class App {
  protected auth = inject(Auth);
  protected demo = httpResource<DemoInfo>(() => '/api/demo');
  private router = inject(Router);

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
