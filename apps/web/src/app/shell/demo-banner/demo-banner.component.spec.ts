import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { AuthUser } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@shelfmark/ui';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthApi } from '../../core/auth/models/auth-api.interface';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { DemoBannerComponent } from './demo-banner.component';

const NOW = new Date('2030-01-01T00:00:00.000Z');
const HOUR = 3_600_000;

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'a@example.com',
    image: null,
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function setup(session: AuthUser, signOut: AuthApi['signOut'] = () => Promise.resolve()) {
  const api: AuthApi = {
    getSession: () => Promise.resolve(session),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(signOut),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: api },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const store = TestBed.inject(AuthStore);
  await store.ensureLoaded();
  vi.useFakeTimers({ now: NOW });
  const fixture = TestBed.createComponent(DemoBannerComponent);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
  fixture.detectChanges();
  return { api, fixture, store, navigate, root: fixture.nativeElement as HTMLElement };
}

function demoIn(ms: number): AuthUser {
  return user({ isDemo: true, demoExpiresAt: new Date(NOW.getTime() + ms).toISOString() });
}

describe('DemoBannerComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('shows nothing for a regular user', async () => {
    const { root } = await setup(user({}));

    expect(root.querySelector('[role="status"]')).toBeNull();
    expect(root.textContent?.trim()).toBe('');
  });

  it('is a status with the title, the hours left and the action for a demo user', async () => {
    const { root } = await setup(demoIn(23 * HOUR - 1000));

    const status = root.querySelector('[role="status"]');
    expect(status?.textContent).toContain("You're in a demo.");
    expect(status?.textContent).toContain('resets in 23 hours.');
    expect(status?.querySelector('button')?.textContent).toContain('Sign in with your own account');
  });

  it('uses the singular for the last hour and never shows 0', async () => {
    const { root } = await setup(demoIn(10 * 60_000));

    expect(root.textContent).toContain('resets in 1 hour.');
    expect(root.textContent).not.toContain('1 hours');
  });

  it('counts down as time passes', async () => {
    const { fixture, root } = await setup(demoIn(2 * HOUR - 1000));
    expect(root.textContent).toContain('resets in 2 hours.');

    await vi.advanceTimersByTimeAsync(HOUR);
    fixture.detectChanges();

    expect(root.textContent).toContain('resets in 1 hour.');
  });

  it('signs out and shows the sign-in screen with the demo-expired reason when time is up', async () => {
    const { api, fixture, store, navigate } = await setup(demoIn(2 * 60_000));

    await vi.advanceTimersByTimeAsync(3 * 60_000);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(store.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/sign-in'], {
      queryParams: { reason: 'demo-expired' },
    });
  });

  it('clears local state and leaves even when the server session is gone at expiry', async () => {
    const { api, fixture, store, navigate, root } = await setup(
      demoIn(2 * 60_000),
      vi.fn(() => Promise.reject(new Error('401'))),
    );
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');

    await vi.advanceTimersByTimeAsync(3 * 60_000);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(store.isSignedIn()).toBe(false);
    expect(show).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/sign-in'], {
      queryParams: { reason: 'demo-expired' },
    });
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('ignores a second click while the sign-out runs', async () => {
    let finish: () => void = () => undefined;
    const { api, fixture, root } = await setup(
      demoIn(5 * HOUR),
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    const button = root.querySelector('button');

    button?.click();
    button?.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.signOut).toHaveBeenCalledTimes(1);
    finish();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  });

  it('is an info notice banner with the action in its slot', async () => {
    const { root } = await setup(demoIn(5 * HOUR));

    expect(root.querySelector('ui-notice.ui-notice--banner.ui-notice--info')).not.toBeNull();
    expect(root.querySelector('.ui-notice__action button')).not.toBeNull();
  });

  it('does not sign out again on later ticks after the expiry', async () => {
    const { api, fixture } = await setup(demoIn(60_000));

    await vi.advanceTimersByTimeAsync(5 * 60_000);
    fixture.detectChanges();

    expect(api.signOut).toHaveBeenCalledTimes(1);
  });

  it('signs out and goes to plain sign-in from the button', async () => {
    const { api, fixture, store, navigate, root } = await setup(demoIn(5 * HOUR));

    root.querySelector('button')?.click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(api.signOut).toHaveBeenCalledTimes(1);
    expect(store.isSignedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/sign-in'], { queryParams: {} });
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it('stays when sign-out fails', async () => {
    const { fixture, store, root } = await setup(
      demoIn(5 * HOUR),
      vi.fn(() => Promise.reject(new Error('down'))),
    );

    root.querySelector('button')?.click();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    expect(store.isSignedIn()).toBe(true);
    expect(root.querySelector('[role="status"]')).not.toBeNull();
  });
});
