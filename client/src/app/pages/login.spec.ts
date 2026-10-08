import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoginPage } from './login';

describe('LoginPage', () => {
  let backend: HttpTestingController;
  let el: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  // The component awaits the HTTP call in a promise chain; let it finish, then re-render.
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  const click = async (text: string) => {
    [...el.querySelectorAll('button')].find((b) => b.textContent!.includes(text))!.click();
    await fixture.whenStable();
  };

  it('asks for email and password before calling the API', async () => {
    await click('Sign in');
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Please enter your email and password.');
    backend.expectNone('/api/auth/login');
  });

  it('shows the API message when the login is rejected', async () => {
    await click('Demo member (Sam)');
    backend.expectOne('/api/auth/login')
      .flush({ detail: 'Invalid email or password.' }, { status: 401, statusText: 'Unauthorized' });
    await settle();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Invalid email or password.');
  });

  it('demo button signs in and goes to the dashboard', async () => {
    await click('Demo manager (Maya)');
    const req = backend.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'maya@taskflow.demo', password: 'Demo123!' });
    req.flush({ id: 2, name: 'Maya Patel', email: 'maya@taskflow.demo', demoRole: 'manager' });
    await settle();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/');
  });
});
