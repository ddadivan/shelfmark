import { TestBed } from '@angular/core/testing';
import {
  LIBRARY_SETTINGS_DEFAULT,
  type AuthUser,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import { DialogService } from '@shelfmark/ui';
import { of } from 'rxjs';
import { AUTH_API } from '../../../core/auth/auth-api.token';
import { AuthStore } from '../../../core/auth/auth.store';
import type { AuthApi } from '../../../core/auth/models/auth-api.interface';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { TRASH_API } from '../../trash/models/trash-api.const';
import { USER_SETTINGS_API } from '../../settings/models/user-settings-api.const';
import type { UserSettingsApi } from '../../settings/models/user-settings-api.interface';
import { CHANGELOG } from '../models/changelog.const';
import { WHATS_NEW_DELAY } from '../models/whats-new-delay.const';
import type { WhatsNewDialogData } from '../models/whats-new-dialog-data.interface';
import { releasedChangelog } from '../utils/changelog-highlights';
import { WhatsNewStore } from './whats-new.store';

const LATEST = releasedChangelog(CHANGELOG)[0]?.version ?? '';

function user(onboarded = true): AuthUser {
  return {
    id: 'u1',
    name: 'Ada',
    email: 'a@example.com',
    image: null,
    isDemo: false,
    demoExpiresAt: null,
    onboardingCompletedAt: onboarded ? '2026-01-01T00:00:00.000Z' : null,
  };
}

async function setup(seen: string | null, session: AuthUser | null = user()) {
  const settings: UserSettingsResponse = {
    trashRetentionDays: 30,
    folderColours: true,
    pauseHistory: false,
    customColours: [],
    customEmoji: [],
    ...MOCK_APPEARANCE_DEFAULTS,
    ...LIBRARY_SETTINGS_DEFAULT,
    whatsNewSeen: seen,
  };
  const settingsApi = {
    get: vi.fn<UserSettingsApi['get']>(() => of(settings)),
    update: vi.fn<UserSettingsApi['update']>((request) => of({ ...settings, ...request })),
  };
  const authApi: AuthApi = {
    getSession: () => Promise.resolve(session),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
  const dialogs = { open: vi.fn((..._args: unknown[]) => ({ result: Promise.resolve() })) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AUTH_API, useValue: authApi },
      { provide: USER_SETTINGS_API, useValue: settingsApi },
      { provide: TRASH_API, useValue: { list: () => of({ items: [], total: 0 }) } },
      { provide: DialogService, useValue: dialogs },
    ],
  });
  await TestBed.inject(AuthStore).ensureLoaded();
  await TestBed.inject(UserSettingsStore).load();
  return { settingsApi, dialogs, store: TestBed.inject(WhatsNewStore) };
}

function dialogData(dialogs: { open: { mock: { calls: unknown[][] } } }): WhatsNewDialogData {
  return (dialogs.open.mock.calls[0]?.[1] as { data: WhatsNewDialogData }).data;
}

describe('WhatsNewStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('marks a new account (onboarding due) up to date silently, without a dot or a dialog', async () => {
    const { store, settingsApi, dialogs } = await setup(null, user(false));

    store.watch();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show * 2);

    expect(settingsApi.update).toHaveBeenCalledWith({ whatsNewSeen: LATEST });
    expect(store.pending()).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('shows the highlights once to an account that never stored a release, and marks it seen', async () => {
    const { store, settingsApi, dialogs } = await setup(null);
    expect(store.pending()).toBe(true);

    store.watch();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show);

    expect(dialogs.open).toHaveBeenCalledTimes(1);
    const highlights = dialogData(dialogs).highlights;
    expect(highlights.length).toBe(4);
    // Newest release first: 2.6.0 and 2.5.0 have one highlight each, then the first two of 2.4.0.
    expect(highlights.map((entry) => [entry.version, entry.item.priority])).toEqual([
      ['2.6.0', 1],
      ['2.5.0', 1],
      ['2.4.0', 1],
      ['2.4.0', 2],
    ]);
    expect(dialogData(dialogs).moreCount).toBeGreaterThan(0);
    expect(settingsApi.update).toHaveBeenCalledWith({ whatsNewSeen: LATEST });
    expect(store.pending()).toBe(false);

    store.watch();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show * 2);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('shows nothing and no dot when the latest release was seen', async () => {
    const { store, dialogs } = await setup(LATEST);

    store.watch();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show * 2);

    expect(store.pending()).toBe(false);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('opens once for the newest release with highlights, past the fix-only ones', async () => {
    // 2.0.1 to 2.0.8 are fixes only; 2.1.0 has highlights, so the card opens once.
    const { store, dialogs } = await setup('2.0.0');

    store.watch();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show * 2);

    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('waits while a dialog is open or a field has focus', async () => {
    const { store, dialogs } = await setup('1.0.0');
    const field = document.createElement('input');
    document.body.appendChild(field);
    field.focus();

    store.watch();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show);
    expect(dialogs.open).not.toHaveBeenCalled();

    field.blur();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Retry);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('opens from the sidebar with the newest highlights even when nothing is new', async () => {
    const { store, dialogs } = await setup(LATEST);

    await store.open();

    expect(dialogData(dialogs).highlights.length).toBeGreaterThan(0);
    expect(dialogData(dialogs).highlights[0]?.item.priority).toBe(1);
  });

  it('cancels a planned dialog when the session ends', async () => {
    const { store, dialogs } = await setup(null);

    store.watch();
    TestBed.inject(SessionScope).end();
    await vi.advanceTimersByTimeAsync(WHATS_NEW_DELAY.Show * 2);

    expect(dialogs.open).not.toHaveBeenCalled();
  });
});
