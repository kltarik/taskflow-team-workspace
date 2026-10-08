import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../api';
import { Auth } from '../auth';
import { Avatar } from '../ui';

@Component({
  selector: 'app-login',
  imports: [FormsModule, Avatar],
  template: `
    <div class="auth-page">
      <section class="auth-intro">
        <p class="brand">
          <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>
          TaskFlow
        </p>
        <h1>Plan the work, assign it, see what's late.</h1>
        <p>A small team task manager with two roles. Every permission is checked by the API, not only hidden in the interface.</p>
        <ul>
          <li><strong>Managers</strong> create projects, add members and assign tasks.</li>
          <li><strong>Members</strong> update their own tasks and comment.</li>
        </ul>
      </section>

      <form class="auth-form" (ngSubmit)="submit()" novalidate>
        <h2>Sign in</h2>
        <p class="muted">All data is fictional demo data.</p>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="username" required [(ngModel)]="email" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required [(ngModel)]="password" />
        </div>

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <button class="primary block" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>

        <p class="divider"><span>or try a demo account</span></p>
        <div class="demo-accounts">
          @for (a of accounts; track a.email) {
            <button type="button" class="account" (click)="demo(a.email)" [disabled]="busy()">
              <app-avatar [name]="a.name" />
              <span><strong>{{ a.name }}</strong><small>{{ a.role }}</small></span>
            </button>
          }
        </div>
      </form>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(Auth);
  private router = inject(Router);

  accounts = [
    { name: 'Maya Patel', role: 'Demo manager', email: 'maya@taskflow.demo' },
    { name: 'Sam Rivera', role: 'Demo member', email: 'sam@taskflow.demo' },
  ];
  email = '';
  password = '';
  busy = signal(false);
  error = signal('');

  demo(email: string) {
    this.email = email;
    this.password = 'Demo123!'; // public demo password, shown on purpose
    this.submit();
  }

  async submit() {
    if (!this.email || !this.password) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigateByUrl('/');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
