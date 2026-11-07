import { TestBed } from '@angular/core/testing';
import { LinksStore } from '../../stores/links.store';
import { SIGN_OUT_FLUSH_TIMEOUT_MS } from './models/sign-out-flush-timeout.const';
import { AUTH_API } from './auth-api.token';
import { AuthStore } from './auth.store';
import { AuthApi } from './models/auth-api.interface';
import { AUTH_PROVIDER } from './models/auth-provider.const';
import { AuthUser } from './models/auth-user.interface';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
};

function setup(overrides: Partial<AuthApi> = {}) {
  const api: AuthApi = {
    getSession: vi.fn(() => Promise.resolve<AuthUser | null>(null)),
    signIn: vi.fn(() => Promise.resolve(USER)),
    signInDemo: vi.fn(() => Promise.resolve({ ...USER, isDemo: true })),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  TestBed.configureTestingModule({ providers: [{ provide: AUTH_API, useValue: api }] });
  return { api, store: TestBed.inject(AuthStore) };
}

describe('AuthStore', () => {
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

  it('signs in with a provider and shows it as pending meanwhile', async () => {
    const { api, store } = setup();

    const done = store.signIn(AUTH_PROVIDER.Google);
    expect(store.pending()).toBe(AUTH_PROVIDER.Google);
    await done;

    expect(api.signIn).toHaveBeenCalledWith(AUTH_PROVIDER.Google);
    expect(store.pending()).toBeNull();
    expect(store.user()).toEqual(USER);
  });

  it('signs in to the demo', async () => {
    const { store } = setup();

    await store.signInDemo();

    expect(store.user()?.isDemo).toBe(true);
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

  it('clears the user on sign-out, even when the API fails', async () => {
    const { store } = setup({ signOut: vi.fn(() => Promise.reject(new Error('down'))) });
    await store.signIn(AUTH_PROVIDER.Google);

    await store.signOut();

    expect(store.user()).toBeNull();
    expect(store.isSignedIn()).toBe(false);
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
