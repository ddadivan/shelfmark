import { TestBed } from '@angular/core/testing';
import { DialogService } from '@shelfmark/ui';
import type { AuthUser, FeedbackMilestone } from '@shelfmark/contracts';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { AuthStore } from '../../core/auth/auth.store';
import type { AuthApi } from '../../core/auth/models/auth-api.interface';
import { RATING_API } from './models/rating-api.const';
import type { RatingApi } from './models/rating-api.interface';
import { RATING_DELAY } from './models/rating-delay.const';
import type { RatingDialogData } from './models/rating-dialog-data.interface';
import { RatingStore } from './rating.store';

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'a@example.com',
    image: null,
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function setup(
  session: AuthUser | null = user(),
  milestone: FeedbackMilestone | null = 'week1',
) {
  const closed = deferred<undefined>();
  const authApi: AuthApi = {
    getSession: () => Promise.resolve(session),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
  const api = {
    prompt: vi.fn(() => Promise.resolve(milestone)),
    record: vi.fn(() => Promise.resolve()),
  } satisfies RatingApi;
  const dialogs = { open: vi.fn((..._args: unknown[]) => ({ result: closed.promise })) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_API, useValue: authApi },
      { provide: RATING_API, useValue: api },
      { provide: DialogService, useValue: dialogs },
    ],
  });
  const auth = TestBed.inject(AuthStore);
  await auth.ensureLoaded();
  return { auth, api, dialogs, closed, store: TestBed.inject(RatingStore) };
}

function dialogData(dialogs: { open: { mock: { calls: unknown[][] } } }): RatingDialogData {
  const config = dialogs.open.mock.calls[0]?.[1] as { data: RatingDialogData };
  return config.data;
}

/** Runs the timers and the promise chains they start. */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

describe('RatingStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('asks the server and opens the dialog 5 s after the watch starts, not before', async () => {
    const { store, api, dialogs } = await setup();

    store.watch();
    await advance(RATING_DELAY.Show - 1);
    expect(api.prompt).not.toHaveBeenCalled();

    await advance(1);
    expect(api.prompt).toHaveBeenCalledTimes(1);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(dialogData(dialogs).milestone).toBe('week1');
    expect(store.open()).toBe(true);
  });

  it('opens nothing when no milestone is due, and asks once per load', async () => {
    const { store, api, dialogs } = await setup(user(), null);

    store.watch();
    store.watch();
    await advance(RATING_DELAY.Show * 4);

    expect(api.prompt).toHaveBeenCalledTimes(1);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it.each([
    ['a demo user', user({ isDemo: true })],
    ['a pending onboarding', user({ onboardingCompletedAt: null })],
    ['a guest', null],
  ])('never asks for %s', async (_name, session) => {
    const { store, api } = await setup(session);

    expect(store.eligible()).toBe(false);
    store.watch();
    await advance(RATING_DELAY.Show * 2);

    expect(api.prompt).not.toHaveBeenCalled();
  });

  it('waits while another dialog is open and opens once it is gone', async () => {
    const { store, api, dialogs } = await setup();
    const other = document.createElement('div');
    other.className = 'cdk-dialog-container';
    document.body.append(other);

    store.watch();
    await advance(RATING_DELAY.Show + RATING_DELAY.Retry);
    expect(api.prompt).not.toHaveBeenCalled();

    other.remove();
    await advance(RATING_DELAY.Retry);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('waits while a text field has focus', async () => {
    const { store, dialogs } = await setup();
    const field = document.createElement('textarea');
    document.body.append(field);
    field.focus();

    store.watch();
    await advance(RATING_DELAY.Show);
    expect(dialogs.open).not.toHaveBeenCalled();

    field.blur();
    await advance(RATING_DELAY.Retry);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('stops asking when the look is cancelled or the user signs out meanwhile', async () => {
    const { store, auth, api } = await setup();

    store.watch();
    store.stop();
    await advance(RATING_DELAY.Show);
    expect(api.prompt).not.toHaveBeenCalled();

    store.watch();
    auth.expireSession();
    await advance(RATING_DELAY.Show);
    expect(api.prompt).not.toHaveBeenCalled();
  });

  it('stays silent when the prompt fails', async () => {
    const { store, api, dialogs } = await setup();
    api.prompt.mockRejectedValueOnce(new Error('offline'));

    store.watch();
    await advance(RATING_DELAY.Show);

    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('records a skip when the dialog closes without a score (Not now, Esc, scrim)', async () => {
    const { store, api, closed } = await setup();

    store.watch();
    await advance(RATING_DELAY.Show);
    closed.resolve(undefined);
    await advance(0);

    expect(api.record).toHaveBeenCalledWith({ milestone: 'week1', score: null });
    expect(store.open()).toBe(false);
  });

  it('records no skip when a score was picked', async () => {
    const { store, api, dialogs, closed } = await setup();

    store.watch();
    await advance(RATING_DELAY.Show);
    dialogData(dialogs).scored.set(true);
    closed.resolve(undefined);
    await advance(0);

    expect(api.record).not.toHaveBeenCalled();
  });
});
