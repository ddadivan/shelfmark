import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { WhatsNewStore } from '../../changelog/services/whats-new.store';
import { OnboardingStore } from '../../onboarding/services/onboarding.store';
import { isRatingBlocked } from '../../rating/utils/rating-blockers';
import { AiAnnounceDialogComponent } from '../components/ai-announce-dialog/ai-announce-dialog.component';
import { AI_ANNOUNCEMENT_DELAY } from '../models/ai-announcement-delay.const';
import { AiSettingsActions } from './ai-settings-actions.service';
import { AiSettingsStore } from './ai-settings.store';

/**
 * The one-time "Shelfmark can now help with AI" dialog (#507). It shows once per account (the
 * server remembers it: `announcementSeen`), only while AI is available and still off, never in the
 * first session of a new account (the welcome tour runs then), and never together with "What's
 * new" or the welcome dialog: it waits until they are gone and no other dialog, focused field or
 * hidden tab is in the way. "Not now", the close button and Esc remember it; "Turn on AI…"
 * remembers it too and opens the AI intro (where the consent happens) at once.
 */
@Service()
export class AiAnnouncementService {
  private readonly auth = inject(AuthStore);
  private readonly settings = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly onboarding = inject(OnboardingStore);
  private readonly whatsNew = inject(WhatsNewStore);
  private readonly dialogs = inject(DialogService);
  private readonly doc = inject(DOCUMENT);

  private timer: ReturnType<typeof setTimeout> | undefined;
  /** The user this load already planned the dialog for: once per user per load. */
  private plannedFor: string | null = null;
  /** The welcome tour was due in this session: a new account's first session stays quiet. */
  private readonly firstSession = signal(false);
  private readonly open = signal(false);

  /** Nothing else in the way (the account side): the dialog is due. */
  private readonly due = computed(
    () =>
      this.auth.user() !== null &&
      !this.auth.user()?.isDemo &&
      this.settings.loaded() &&
      this.settings.available() &&
      !this.settings.isOn() &&
      !this.settings.announcementSeen() &&
      !this.firstSession() &&
      !this.onboarding.due() &&
      !this.onboarding.open() &&
      !this.whatsNew.pending() &&
      !this.whatsNew.dialogOpen(),
  );

  constructor() {
    // Plans the dialog whenever one of the things it depends on changes (the shell injects this
    // service once).
    effect(() => {
      this.auth.user();
      this.due();
      this.onboarding.due();
      this.onboarding.open();
      untracked(() => this.watch());
    });
    inject(SessionScope).onEnd(() => {
      this.stop();
      this.plannedFor = null;
      this.firstSession.set(false);
      this.open.set(false);
    });
  }

  /** Plans the dialog once per load when it is due (run by the effect above). */
  private watch(): void {
    const user = this.auth.user();
    if (user === null) {
      return;
    }
    if (this.onboarding.due() || this.onboarding.open()) {
      this.firstSession.set(true);
    }
    if (!this.due() || this.plannedFor === user.id || this.open()) {
      return;
    }
    this.plannedFor = user.id;
    this.stop();
    this.timer = setTimeout(() => this.attempt(user.id), AI_ANNOUNCEMENT_DELAY.Show);
  }

  private stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private attempt(userId: string): void {
    this.timer = undefined;
    if (this.auth.user()?.id !== userId || !this.due()) {
      return;
    }
    if (this.open() || isRatingBlocked(this.doc)) {
      this.timer = setTimeout(() => this.attempt(userId), AI_ANNOUNCEMENT_DELAY.Retry);
      return;
    }
    void this.show();
  }

  private async show(): Promise<void> {
    this.open.set(true);
    // Remembered as it opens: whatever the user does, the dialog is not offered again.
    void this.settings.update({ announcementSeen: true });
    let turnOn: boolean | undefined;
    try {
      turnOn = await this.dialogs.open<AiAnnounceDialogComponent, boolean>(
        AiAnnounceDialogComponent,
        { size: DIALOG_SIZE.Md, autoFocus: '.ai-announce__turn-on button' },
      ).result;
    } finally {
      this.open.set(false);
    }
    if (turnOn === true) {
      await this.actions.setEnabled(true);
    }
  }
}
