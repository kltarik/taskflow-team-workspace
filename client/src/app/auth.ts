import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { Me } from './api';

// Holds "who is logged in". The session itself lives in an HttpOnly cookie that
// JavaScript never sees; the browser attaches it to every /api request automatically.
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  readonly user = signal<Me | null>(null);

  // Runs once at startup: a still-valid cookie means we're already logged in.
  async load() {
    try {
      this.user.set(await firstValueFrom(this.http.get<Me>('/api/auth/me')));
    } catch {
      this.user.set(null);
    }
  }

  async login(email: string, password: string) {
    this.user.set(await firstValueFrom(this.http.post<Me>('/api/auth/login', { email, password })));
  }

  async logout() {
    await firstValueFrom(this.http.post('/api/auth/logout', {}));
    this.user.set(null);
  }
}

// Route guard: pages behind it need a logged-in user, otherwise go to /login.
export const authGuard: CanActivateFn = () =>
  inject(Auth).user() ? true : inject(Router).parseUrl('/login');

// If any API call answers 401 (e.g. the session expired), forget the user and show the login page.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/api/auth/')) {
        auth.user.set(null);
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
