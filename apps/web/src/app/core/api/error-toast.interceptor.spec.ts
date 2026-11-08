import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { AuthStore } from '../auth/auth.store';
import { errorInterceptor } from './error.interceptor';
import { ERROR_TOAST_DEDUPE_MS } from './models/error-toast-dedupe.const';
import { skipErrorToast } from './skip-error-toast';

function setup() {
  const show = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      { provide: ToastService, useValue: { show } },
      { provide: TranslocoService, useValue: { translate: (key: string) => `t:${key}` } },
      {
        provide: AuthStore,
        useValue: { expireSession: vi.fn(), user: signal({ id: 'u1' }) },
      },
      { provide: Router, useValue: { url: '/links', navigate: vi.fn() } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
    show,
  };
}

function fail(controller: HttpTestingController, url: string, status: number): void {
  controller.expectOne(url).flush(null, { status, statusText: 'x' });
}

describe('errorInterceptor toasts', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  it('toasts a 429 and rethrows the error', () => {
    const { http, controller, show } = setup();
    let status = 0;

    http.get('/api/links').subscribe({ error: (e: { status: number }) => (status = e.status) });
    fail(controller, '/api/links', 429);

    expect(show).toHaveBeenCalledWith({
      kind: TOAST_KIND.Error,
      text: 't:errors.rateLimited',
    });
    expect(status).toBe(429);
  });

  it.each([500, 503])('toasts a %i and rethrows the error', (code) => {
    const { http, controller, show } = setup();
    let status = 0;

    http.get('/api/links').subscribe({ error: (e: { status: number }) => (status = e.status) });
    fail(controller, '/api/links', code);

    expect(show).toHaveBeenCalledWith({ kind: TOAST_KIND.Error, text: 't:errors.server' });
    expect(status).toBe(code);
  });

  it.each([400, 404, 409])('does not toast a %i', (code) => {
    const { http, controller, show } = setup();

    http.get('/api/links').subscribe({ error: () => undefined });
    fail(controller, '/api/links', code);

    expect(show).not.toHaveBeenCalled();
  });

  it('does not toast /api/auth requests', () => {
    const { http, controller, show } = setup();

    http.get('/api/auth/get-session').subscribe({ error: () => undefined });
    fail(controller, '/api/auth/get-session', 500);

    expect(show).not.toHaveBeenCalled();
  });

  it('does not toast other origins or paths outside /api', () => {
    const { http, controller, show } = setup();

    http.get('https://other.example/api/links').subscribe({ error: () => undefined });
    fail(controller, 'https://other.example/api/links', 500);
    http.get('/assets/x.json').subscribe({ error: () => undefined });
    fail(controller, '/assets/x.json', 500);

    expect(show).not.toHaveBeenCalled();
  });

  it('does not toast a failed Sentry tunnel request', () => {
    const { http, controller, show } = setup();

    http.post('/api/monitoring/tunnel', '').subscribe({ error: () => undefined });
    fail(controller, '/api/monitoring/tunnel', 503);

    expect(show).not.toHaveBeenCalled();
  });

  it('does not toast when the caller opted out, and still rethrows', () => {
    const { http, controller, show } = setup();
    let status = 0;

    http
      .get('/api/links', { context: skipErrorToast() })
      .subscribe({ error: (e: { status: number }) => (status = e.status) });
    fail(controller, '/api/links', 429);

    expect(show).not.toHaveBeenCalled();
    expect(status).toBe(429);
  });

  it('shows identical toasts once within the window, again after it', () => {
    vi.useFakeTimers();
    const { http, controller, show } = setup();

    http.get('/api/links').subscribe({ error: () => undefined });
    http.get('/api/folders').subscribe({ error: () => undefined });
    fail(controller, '/api/links', 500);
    fail(controller, '/api/folders', 502);
    expect(show).toHaveBeenCalledTimes(1);

    // A different message is not a duplicate.
    http.get('/api/tags').subscribe({ error: () => undefined });
    fail(controller, '/api/tags', 429);
    expect(show).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(ERROR_TOAST_DEDUPE_MS);
    http.get('/api/links').subscribe({ error: () => undefined });
    fail(controller, '/api/links', 500);
    expect(show).toHaveBeenCalledTimes(3);
  });
});
