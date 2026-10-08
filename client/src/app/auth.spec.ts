import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Me } from './api';
import { Auth, authGuard, authInterceptor } from './auth';

const sam: Me = { id: 1, name: 'Sam Rivera', email: 'sam@taskflow.demo', demoRole: 'member' };

describe('auth', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: Auth;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => backend.verify());

  const guard = () => TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

  it('guard sends a logged-out visitor to /login', () => {
    const result = guard() as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login');
  });

  it('guard lets a logged-in user through', () => {
    auth.user.set(sam);
    expect(guard()).toBe(true);
  });

  it('load() restores the session from /api/auth/me', async () => {
    const done = auth.load();
    backend.expectOne('/api/auth/me').flush(sam);
    await done;
    expect(auth.user()).toEqual(sam);
  });

  it('load() leaves the user logged out when there is no session', async () => {
    const done = auth.load();
    backend.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await done;
    expect(auth.user()).toBeNull();
  });

  it('a 401 from any API call logs the user out and opens /login', async () => {
    auth.user.set(sam);
    const call = firstValueFrom(http.get('/api/projects'));
    backend.expectOne('/api/projects').flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toBeTruthy();
    expect(auth.user()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('a failed login (401 on /api/auth/login) stays on the page', async () => {
    const login = auth.login('sam@taskflow.demo', 'wrong');
    backend.expectOne('/api/auth/login').flush({ detail: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });
    await expect(login).rejects.toBeTruthy();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
