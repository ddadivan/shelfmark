import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { AUTH_ROUTE } from '../auth/models/auth-routes.const';
import { SIGN_IN_QUERY } from '../auth/models/sign-in-query.const';
import { SIGN_IN_REASON } from '../auth/models/sign-in-reason.const';
import { errorInterceptor } from './error.interceptor';

function setup(url = '/links?tag=a') {
  const user = signal<{ id: string } | null>({ id: 'u1' });
  const expireSession = vi.fn(() => user.set(null));
  const navigate = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: AuthStore, useValue: { expireSession, user } },
      { provide: Router, useValue: { url, navigate } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    expireSession,
    navigate,
    user,
  };
}

function unauthorized(controller: HttpTestingController, url: string): void {
  controller.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
}

describe('errorInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('clears the user and goes to sign-in with the current page as returnUrl on a 401', () => {
    const { http, controller, expireSession, navigate } = setup();
    let status = 0;

    http.get('/api/links').subscribe({ error: (e: { status: number }) => (status = e.status) });
    unauthorized(controller, '/api/links');

    expect(status).toBe(401);
    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith([AUTH_ROUTE.SignIn], {
      queryParams: {
        [SIGN_IN_QUERY.Reason]: SIGN_IN_REASON.SessionExpired,
        [SIGN_IN_QUERY.ReturnUrl]: '/links?tag=a',
      },
    });
  });

  it('does not touch /api/auth requests', () => {
    const { http, controller, expireSession, navigate } = setup();

    http.get('/api/auth/get-session').subscribe({ error: () => undefined });
    unauthorized(controller, '/api/auth/get-session');

    expect(expireSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not touch requests outside /api or to another origin', () => {
    const { http, controller, expireSession } = setup();

    http.get('/assets/x.json').subscribe({ error: () => undefined });
    unauthorized(controller, '/assets/x.json');
    http.get('https://other.example/api/links').subscribe({ error: () => undefined });
    unauthorized(controller, 'https://other.example/api/links');

    expect(expireSession).not.toHaveBeenCalled();
  });

  it('leaves other statuses to the caller', () => {
    const { http, controller, expireSession } = setup();

    http.get('/api/links').subscribe({ error: () => undefined });
    controller.expectOne('/api/links').flush(null, { status: 429, statusText: 'Too Many' });

    expect(expireSession).not.toHaveBeenCalled();
  });

  it('does not redirect again when already on the sign-in screen', () => {
    const { http, controller, expireSession, navigate } = setup(`${AUTH_ROUTE.SignIn}?reason=x`);

    http.get('/api/links').subscribe({ error: () => undefined });
    unauthorized(controller, '/api/links');

    expect(expireSession).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects once for parallel 401s', () => {
    const { http, controller, expireSession, navigate } = setup();

    http.get('/api/links').subscribe({ error: () => undefined });
    http.get('/api/folders').subscribe({ error: () => undefined });
    unauthorized(controller, '/api/links');
    unauthorized(controller, '/api/folders');

    expect(expireSession).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores a 401 after sign-out', () => {
    const { http, controller, expireSession, navigate, user } = setup();
    user.set(null);

    http.get('/api/links').subscribe({ error: () => undefined });
    unauthorized(controller, '/api/links');

    expect(expireSession).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
