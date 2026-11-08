import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { AuthUser } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { DemoSignInError } from '../../core/auth/demo-sign-in-error';
import { AuthApi } from '../../core/auth/models/auth-api.interface';
import { DEMO_ERROR } from '../../core/auth/models/demo-error.const';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import DemoStartPage from './demo-start.page';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};
const DEMO: AuthUser = { ...USER, isDemo: true, demoExpiresAt: '2030-01-02T00:00:00.000Z' };

async function setup(overrides: Partial<AuthApi> = {}) {
  const api: AuthApi = {
    getSession: vi.fn(() => Promise.resolve<AuthUser | null>(null)),
    signIn: vi.fn(() => Promise.resolve(USER)),
    signInDemo: vi.fn(() => Promise.resolve(DEMO)),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'demo', component: DemoStartPage },
        { path: '**', children: [] },
      ]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: api },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const harness = await RouterTestingHarness.create();
  return { api, harness, router: TestBed.inject(Router) };
}

describe('DemoStartPage', () => {
  it('shows a status while it starts the demo', async () => {
    let finish: (user: AuthUser) => void = () => undefined;
    const { harness } = await setup({
      signInDemo: vi.fn(() => new Promise<AuthUser>((resolve) => (finish = resolve))),
    });

    await harness.navigateByUrl('/demo');
    await vi.waitFor(() =>
      expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Opening the demo'),
    );
    finish(DEMO);
    await harness.fixture.whenStable();
  });

  it('creates a demo session and opens the library', async () => {
    const { api, harness, router } = await setup();

    await harness.navigateByUrl('/demo');
    await vi.waitFor(() => expect(router.url).toBe('/links'));

    expect(api.signInDemo).toHaveBeenCalledTimes(1);
  });

  it('goes straight to the library when already signed in', async () => {
    const { api, harness, router } = await setup({
      getSession: vi.fn(() => Promise.resolve<AuthUser | null>(USER)),
    });

    await harness.navigateByUrl('/demo');
    await vi.waitFor(() => expect(router.url).toBe('/links'));

    expect(api.signInDemo).not.toHaveBeenCalled();
  });

  it.each([
    [new DemoSignInError(DEMO_ERROR.RateLimited), 'demo-limit'],
    [new DemoSignInError(DEMO_ERROR.Unavailable), 'demo-unavailable'],
    [new Error('down'), 'demo-failed'],
  ])('goes to sign-in with a reason when the demo fails (%s)', async (error, reason) => {
    const { harness, router } = await setup({ signInDemo: vi.fn(() => Promise.reject(error)) });

    await harness.navigateByUrl('/demo');
    await vi.waitFor(() => expect(router.url).toBe(`/sign-in?reason=${reason}`));
  });
});
