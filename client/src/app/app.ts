import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './auth';

// The app shell: top bar (only when logged in) + the current page.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
    <main class="page">
      <router-outlet />
    </main>
  `,
})
export class App {
  protected auth = inject(Auth);
  private router = inject(Router);

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
