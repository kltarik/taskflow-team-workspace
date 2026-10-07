import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errorMessage } from '../api';
import { Auth } from '../auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="auth-page">
      <form class="card auth-card" (ngSubmit)="submit()" novalidate>
        <h1>TaskFlow</h1>
        <p class="muted">A small team task manager with manager and member roles. All data is fictional demo data.</p>

        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="username" required [(ngModel)]="email" />

        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required [(ngModel)]="password" />

        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

        <button class="primary" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>

        <p class="muted">Or try a demo account:</p>
        <div class="row">
          <button type="button" (click)="demo('maya@taskflow.demo')" [disabled]="busy()">Demo manager (Maya)</button>
          <button type="button" (click)="demo('sam@taskflow.demo')" [disabled]="busy()">Demo member (Sam)</button>
        </div>
      </form>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(Auth);
  private router = inject(Router);

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
