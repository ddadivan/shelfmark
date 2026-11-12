import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { DialogService, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { AuthStore } from '../../core/auth/auth.store';
import type { AuthApi } from '../../core/auth/models/auth-api.interface';
import { AUTH_PROVIDER, type AuthUser } from '@shelfmark/contracts';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { LinkActionsService } from '../links/services/link-actions.service';
import { ONBOARDING_API } from './models/onboarding-api.const';
import type { OnboardingApi } from './models/onboarding-api.interface';
import { ONBOARDING_RESULT } from './models/onboarding-result.const';
import type { OnboardingResult } from './models/onboarding-result.type';
import { OnboardingStore } from './onboarding.store';

const SERVER_TIME = '2026-03-03T10:00:00.000Z';

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'a@example.com',
    image: null,
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: null,
    ...overrides,
  };
}

/** Resolves a promise from the outside: the dialog result, or a pending request. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function setup(session: AuthUser | null = user()) {
  const closed = deferred<OnboardingResult | undefined>();
  const authApi: AuthApi = {
    getSession: () => Promise.resolve(session),
    signIn: vi.fn(() => Promise.resolve(user({ id: 'u2' }))),
    signInDemo: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
  const api = {
    complete: vi.fn(() => Promise.resolve({ onboardingCompletedAt: SERVER_TIME })),
  } satisfies OnboardingApi;
  const dialogs = { open: vi.fn(() => ({ result: closed.promise })) };
  const toasts = { show: vi.fn() };
  const actions = { addLink: vi.fn(() => Promise.resolve()) };
  TestBed.configureTestingModule({
    providers: [
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: authApi },
      { provide: ONBOARDING_API, useValue: api },
      { provide: DialogService, useValue: dialogs },
      { provide: ToastService, useValue: toasts },
      { provide: LinkActionsService, useValue: actions },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const auth = TestBed.inject(AuthStore);
  await auth.ensureLoaded();
  return { auth, api, dialogs, toasts, actions, closed, store: TestBed.inject(OnboardingStore) };
}

/** Lets the promise chains of the store settle. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('OnboardingStore', () => {
  it('is cleared when the session ends, however it ends', async () => {
    const { store, auth, closed } = await setup();
    store.openIfDue();
    expect(store.open()).toBe(true);

    auth.expireSession();

    expect(store.open()).toBe(false);
    closed.resolve(undefined);
  });

  it('is due while the flag is null', async () => {
    const { store } = await setup();

    expect(store.due()).toBe(true);
  });

  it.each([
    ['a completed flag', user({ onboardingCompletedAt: SERVER_TIME })],
    ['a missing flag', { ...user(), onboardingCompletedAt: undefined } as unknown as AuthUser],
    ['a guest', null],
  ])('is not due with %s, and opens nothing', async (_name, session) => {
    const { store, dialogs } = await setup(session);

    store.openIfDue();

    expect(store.due()).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
    expect(store.open()).toBe(false);
  });

  it('opens once per transition, however often it is asked', async () => {
    const { store, dialogs } = await setup();

    store.openIfDue();
    store.openIfDue();

    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(store.open()).toBe(true);
  });

  it('patches the flag before the server answers, then keeps the server time', async () => {
    const { store, auth, api, closed } = await setup();
    const pending = deferred<{ onboardingCompletedAt: string }>();
    api.complete.mockReturnValueOnce(pending.promise);

    store.openIfDue();
    closed.resolve(ONBOARDING_RESULT.Skipped);
    await flush();

    expect(store.open()).toBe(false);
    expect(api.complete).toHaveBeenCalledTimes(1);
    expect(auth.user()?.onboardingCompletedAt).not.toBeNull();
    expect(auth.user()?.onboardingCompletedAt).not.toBe(SERVER_TIME);

    pending.resolve({ onboardingCompletedAt: SERVER_TIME });
    await flush();

    expect(auth.user()?.onboardingCompletedAt).toBe(SERVER_TIME);
  });

  it('counts Esc and the scrim (no result) as Skip and does not add a link', async () => {
    const { store, api, actions, closed } = await setup();

    store.openIfDue();
    closed.resolve(undefined);
    await flush();

    expect(api.complete).toHaveBeenCalledTimes(1);
    expect(actions.addLink).not.toHaveBeenCalled();
  });

  it('opens the add-link dialog after "Add your first link"', async () => {
    const { store, api, actions, closed } = await setup();

    store.openIfDue();
    closed.resolve(ONBOARDING_RESULT.AddLink);
    await flush();

    expect(api.complete).toHaveBeenCalledTimes(1);
    expect(actions.addLink).toHaveBeenCalledTimes(1);
  });

  it('stays closed and silent when completing fails, and does not reopen', async () => {
    const { store, auth, api, dialogs, toasts, closed } = await setup();
    api.complete.mockRejectedValueOnce(new Error('offline'));

    store.openIfDue();
    closed.resolve(ONBOARDING_RESULT.Skipped);
    await flush();
    store.openIfDue();

    expect(toasts.show).not.toHaveBeenCalled();
    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(store.due()).toBe(false);
    expect(auth.user()?.onboardingCompletedAt).not.toBeNull();
  });

  it('has no way to make the tour due again once it is done (#315)', async () => {
    const { store } = await setup(user({ onboardingCompletedAt: SERVER_TIME }));

    expect(store.due()).toBe(false);
    expect('reset' in store).toBe(false);
  });

  it('resets open when the dialog cannot be opened', async () => {
    const { store, dialogs } = await setup();
    dialogs.open.mockImplementationOnce(() => {
      throw new Error('no overlay');
    });

    store.openIfDue();
    await flush();

    expect(store.open()).toBe(false);
  });

  it('takes the flag from the next session after a user switch', async () => {
    const { store, auth, api, closed } = await setup();

    store.openIfDue();
    // Signed out, then another user signs in while the first dialog was still open.
    await auth.signOut();
    await auth.signIn(AUTH_PROVIDER.Google);
    closed.resolve(ONBOARDING_RESULT.Skipped);
    await flush();

    // Nobody completed anything for the new session: its own flag decides.
    expect(api.complete).not.toHaveBeenCalled();
    expect(auth.user()?.id).toBe('u2');
    expect(store.due()).toBe(true);
  });
});
