import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { AUTH_PROVIDER, type AuthUser } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { SIGN_OUT_FLUSH_TIMEOUT_MS } from './models/sign-out-flush-timeout.const';
import { AppTranslocoLoader } from '../i18n/app-transloco.loader';
import { translocoConfig } from '../i18n/transloco.config';
import { DemoSignInError } from './demo-sign-in-error';
import { DEMO_ERROR } from './models/demo-error.const';
import { SIGN_IN_REASON } from './models/sign-in-reason.const';
import { AUTH_API } from './auth-api.token';
import { SessionScope } from './session-scope.service';
import { AuthStore } from './auth.store';
import { AuthApi } from './models/auth-api.interface';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

function setup(overrides: Partial<AuthApi> = {}) {
  const api: AuthApi = {
    getSession: vi.fn(() => Promise.resolve<AuthUser | null>(null)),
    signIn: vi.fn(() => Promise.resolve(USER)),
    signInDemo: vi.fn(() =>
      Promise.resolve({ ...USER, isDemo: true, demoExpiresAt: '2030-01-02T00:00:00.000Z' }),
    ),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_API, useValue: api },
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
    ],
  });
  return { api, store: TestBed.inject(AuthStore) };
}

describe('AuthStore', () => {
  it('forgets the user and the cached library when the session expires', async () => {
    const { api, store } = setup({ getSession: vi.fn(() => Promise.resolve(USER)) });
    await store.ensureLoaded();
    const links = TestBed.inject(LinksStore);
    const reset = vi.spyOn(links, 'reset');

    store.expireSession();

    expect(store.user()).toBeNull();
    expect(store.loaded()).toBe(true);
    expect(reset).toHaveBeenCalled();
    expect(api.signOut).not.toHaveBeenCalled();
  });

  it('tells the session scope when the session ends, on every path', async () => {
    const { store, api } = setup();
    await store.ensureLoaded();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const ended = vi.fn();
    TestBed.inject(SessionScope).onEnd(ended);

    store.expireSession();
    await store.signOut();
    await store.expireDemo();

    expect(ended).toHaveBeenCalledTimes(3);
    expect(api.signOut).toHaveBeenCalledTimes(2);
  });

  it('is a guest until the session says otherwise', () => {
    const { store } = setup();

    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
    expect(store.pending()).toBeNull();
    expect(store.failed()).toBe(false);
  });

  it('asks for the session once, however many guards wait for it', async () => {
    const { api, store } = setup({ getSession: vi.fn(() => Promise.resolve(USER)) });

    await Promise.all([store.ensureLoaded(), store.ensureLoaded()]);
    await store.ensureLoaded();

    expect(api.getSession).toHaveBeenCalledTimes(1);
    expect(store.user()).toEqual(USER);
    expect(store.isSignedIn()).toBe(true);
  });

  it('treats a failing session request as a guest and retries on the next call', async () => {
    const getSession = vi
      .fn<AuthApi['getSession']>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(USER);
    const { store } = setup({ getSession });

    await store.ensureLoaded();
    expect(store.isSignedIn()).toBe(false);
    expect(store.loaded()).toBe(false);

    await store.ensureLoaded();
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(store.isSignedIn()).toBe(true);
  });

  it('sets the onboarding flag of the signed-in user, and ignores a guest', async () => {
    const { store } = setup();
    store.setOnboardingCompletedAt('2026-01-01T00:00:00.000Z');
    expect(store.user()).toBeNull();

    await store.signIn(AUTH_PROVIDER.Google);
    store.setOnboardingCompletedAt('2026-01-01T00:00:00.000Z');
    expect(store.user()?.onboardingCompletedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('signs in with a provider and shows it as pending meanwhile', async () => {
    const { api, store } = setup();

    const done = store.signIn(AUTH_PROVIDER.Google);
    expect(store.pending()).toBe(AUTH_PROVIDER.Google);
    await done;

    expect(api.signIn).toHaveBeenCalledWith(AUTH_PROVIDER.Google, null);
    expect(store.pending()).toBeNull();
    expect(store.user()).toEqual(USER);
  });

  it('signs in to the demo', async () => {
    const { store } = setup();

    await store.signInDemo();

    expect(store.user()?.isDemo).toBe(true);
  });

  it('keeps a typed demo failure and clears it on the next attempt', async () => {
    const signInDemo = vi
      .fn<AuthApi['signInDemo']>()
      .mockRejectedValueOnce(new DemoSignInError(DEMO_ERROR.RateLimited))
      .mockResolvedValueOnce({ ...USER, isDemo: true, demoExpiresAt: '2030-01-02T00:00:00.000Z' });
    const { store } = setup({ signInDemo });

    await store.signInDemo();
    expect(store.failed()).toBe(true);
    expect(store.demoError()).toBe(DEMO_ERROR.RateLimited);

    await store.signInDemo();
    expect(store.demoError()).toBeNull();
    expect(store.isSignedIn()).toBe(true);
  });

  it('has no demo error for a plain failure', async () => {
    const { store } = setup({ signInDemo: vi.fn(() => Promise.reject(new Error('down'))) });

    await store.signInDemo();

    expect(store.failed()).toBe(true);
    expect(store.demoError()).toBeNull();
  });

  it('leaves to the sign-in screen with a reason after sign-out', async () => {
    const { store } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await store.signIn(AUTH_PROVIDER.Google);

    await store.signOutAndLeave(SIGN_IN_REASON.DemoExpired);

    expect(navigate).toHaveBeenCalledWith(['/sign-in'], {
      queryParams: { reason: 'demo-expired' },
    });
  });

  it('marks a failed sign-in and clears the flag on the next attempt', async () => {
    const signIn = vi
      .fn<AuthApi['signIn']>()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce(USER);
    const { store } = setup({ signIn });

    await store.signIn(AUTH_PROVIDER.GitHub);
    expect(store.failed()).toBe(true);
    expect(store.pending()).toBeNull();
    expect(store.isSignedIn()).toBe(false);

    await store.signIn(AUTH_PROVIDER.GitHub);
    expect(store.failed()).toBe(false);
    expect(store.isSignedIn()).toBe(true);
  });

  it('ignores a second sign-in while one is running', async () => {
    const { api, store } = setup();

    const first = store.signIn(AUTH_PROVIDER.Google);
    await store.signIn(AUTH_PROVIDER.GitHub);
    await first;

    expect(api.signIn).toHaveBeenCalledTimes(1);
  });

  it('keeps the user signed in and shows an error when sign-out fails', async () => {
    const { store } = setup({ signOut: vi.fn(() => Promise.reject(new Error('down'))) });
    const show = vi.spyOn(TestBed.inject(ToastService), 'show');
    const links = vi.spyOn(TestBed.inject(LinksStore), 'reset');
    await store.signIn(AUTH_PROVIDER.Google);

    const signedOut = await store.signOut();

    expect(signedOut).toBe(false);
    expect(store.user()).toEqual(USER);
    expect(store.isSignedIn()).toBe(true);
    expect(links).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith(expect.objectContaining({ kind: TOAST_KIND.Error }));
  });

  it('does not leave the page when sign-out fails', async () => {
    const { store } = setup({ signOut: vi.fn(() => Promise.reject(new Error('down'))) });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    await store.signIn(AUTH_PROVIDER.Google);

    await store.signOutAndLeave();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears the user after a confirmed sign-out', async () => {
    const { store } = setup();
    await store.signIn(AUTH_PROVIDER.Google);

    expect(await store.signOut()).toBe(true);

    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
  });

  it('passes the return URL, stays a guest and keeps pending while the browser leaves', async () => {
    const { api, store } = setup({ signIn: vi.fn(() => Promise.resolve(null)) });

    await store.signIn(AUTH_PROVIDER.GitHub, '/links');

    expect(api.signIn).toHaveBeenCalledWith(AUTH_PROVIDER.GitHub, '/links');
    expect(store.isSignedIn()).toBe(false);
    expect(store.pending()).toBe(AUTH_PROVIDER.GitHub);
    expect(store.failed()).toBe(false);
  });

  it('resets pending when the page comes back from the back/forward cache', async () => {
    const { store } = setup({ signIn: vi.fn(() => Promise.resolve(null)) });
    await store.signIn(AUTH_PROVIDER.GitHub, null);

    globalThis.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
    expect(store.pending()).toBe(AUTH_PROVIDER.GitHub);

    globalThis.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    expect(store.pending()).toBeNull();
  });

  it('sends waiting deletes before the session ends, then forgets the links of the user on sign-out', async () => {
    const order: string[] = [];
    const { store } = setup({
      signOut: vi.fn(() => {
        order.push('api');
        return Promise.resolve();
      }),
    });
    const links = TestBed.inject(LinksStore);
    vi.spyOn(links, 'flushPending').mockImplementation(async () => {
      await Promise.resolve();
      order.push('flush');
    });
    vi.spyOn(links, 'reset').mockImplementation(() => {
      order.push('reset');
    });
    await store.signIn(AUTH_PROVIDER.Google);

    await store.signOut();

    expect(order).toEqual(['flush', 'api', 'reset']);
  });

  it('forgets the folders of the user on sign-out, next to the links', async () => {
    const { store } = setup();
    const folders = TestBed.inject(FoldersStore);
    const reset = vi.spyOn(folders, 'reset');
    await store.signIn(AUTH_PROVIDER.Google);

    await store.signOut();

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('still signs out after the timeout when the flush never finishes', async () => {
    vi.useFakeTimers();
    try {
      const { api, store } = setup();
      const links = TestBed.inject(LinksStore);
      vi.spyOn(links, 'flushPending').mockReturnValue(new Promise<void>(() => undefined));
      await store.signIn(AUTH_PROVIDER.Google);

      const done = store.signOut();
      await vi.advanceTimersByTimeAsync(SIGN_OUT_FLUSH_TIMEOUT_MS);
      await done;

      expect(api.signOut).toHaveBeenCalled();
      expect(store.user()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('still signs out when the flush rejects', async () => {
    const { api, store } = setup();
    vi.spyOn(TestBed.inject(LinksStore), 'flushPending').mockRejectedValue(new Error('boom'));
    await store.signIn(AUTH_PROVIDER.Google);

    await store.signOut();

    expect(api.signOut).toHaveBeenCalled();
    expect(store.user()).toBeNull();
  });
});
