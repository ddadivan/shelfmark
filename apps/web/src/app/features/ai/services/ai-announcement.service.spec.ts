import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AuthUser } from '@shelfmark/contracts';
import { DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { WhatsNewStore } from '../../changelog/services/whats-new.store';
import { OnboardingStore } from '../../onboarding/services/onboarding.store';
import { AI_ANNOUNCEMENT_DELAY } from '../models/ai-announcement-delay.const';
import { AiAnnouncementService } from './ai-announcement.service';
import { AiSettingsActions } from './ai-settings-actions.service';
import { AiSettingsStore } from './ai-settings.store';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
};

function setup(
  options: {
    user?: AuthUser | null;
    on?: boolean;
    seen?: boolean;
    available?: boolean;
    whatsNewPending?: boolean;
    onboardingDue?: boolean;
  } = {},
) {
  vi.useFakeTimers();
  const user = signal<AuthUser | null>('user' in options ? (options.user ?? null) : USER);
  const onboardingDue = signal(options.onboardingDue ?? false);
  const whatsNewPending = signal(options.whatsNewPending ?? false);
  const settings = {
    loaded: signal(true),
    available: signal(options.available ?? true),
    isOn: signal(options.on ?? false),
    announcementSeen: signal(options.seen ?? false),
    update: vi.fn((change: { announcementSeen?: true }) => {
      if (change.announcementSeen) {
        settings.announcementSeen.set(true);
      }
      return Promise.resolve(true);
    }),
  };
  const actions = { setEnabled: vi.fn(() => Promise.resolve(true)) };
  const result = signal<Promise<boolean | undefined>>(Promise.resolve(false));
  const dialogs = { open: vi.fn((..._args: unknown[]) => ({ result: result() })) };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user } },
      { provide: AiSettingsStore, useValue: settings },
      { provide: AiSettingsActions, useValue: actions },
      { provide: OnboardingStore, useValue: { due: onboardingDue, open: signal(false) } },
      { provide: WhatsNewStore, useValue: { pending: whatsNewPending, dialogOpen: signal(false) } },
      { provide: DialogService, useValue: dialogs },
      { provide: SessionScope, useValue: { onEnd: vi.fn() } },
    ],
  });
  TestBed.inject(AiAnnouncementService);
  TestBed.tick();
  return { dialogs, actions, settings, whatsNewPending, onboardingDue, result };
}

describe('AiAnnouncementService (#507)', () => {
  afterEach(() => vi.useRealTimers());

  it('opens once when AI is available and off, and remembers it as it opens', async () => {
    const { dialogs, settings } = setup();
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(settings.update).toHaveBeenCalledWith({ announcementSeen: true });
  });

  it('"Turn on AI…" hands over to the AI intro through the settings flow', async () => {
    const { dialogs, actions, result } = setup();
    result.set(Promise.resolve(true));
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
    expect(actions.setEnabled).toHaveBeenCalledWith(true);
  });

  it('"Not now" does not open the intro', async () => {
    const { actions } = setup();
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show);
    expect(actions.setEnabled).not.toHaveBeenCalled();
  });

  it.each([
    ['AI is already on', { on: true }],
    ['it was seen', { seen: true }],
    ['AI is not available', { available: false }],
    ['nobody is signed in', { user: null }],
    ['the account is new (welcome tour due)', { onboardingDue: true }],
  ])('stays closed when %s', async (_name, options) => {
    const { dialogs } = setup(options);
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show * 3);
    expect(dialogs.open).not.toHaveBeenCalled();
  });

  it('waits for "What’s new" and then shows', async () => {
    const { dialogs, whatsNewPending } = setup({ whatsNewPending: true });
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show * 2);
    expect(dialogs.open).not.toHaveBeenCalled();
    whatsNewPending.set(false);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show);
    expect(dialogs.open).toHaveBeenCalledTimes(1);
  });

  it('stays quiet for the rest of a new account’s first session', async () => {
    const { dialogs, onboardingDue } = setup({ onboardingDue: true });
    onboardingDue.set(false);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(AI_ANNOUNCEMENT_DELAY.Show * 3);
    expect(dialogs.open).not.toHaveBeenCalled();
  });
});
