import { DOCUMENT } from '@angular/common';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../../core/auth/auth.store';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { isRatingBlocked } from '../../rating/utils/rating-blockers';
import { WhatsNewDialogComponent } from '../components/whats-new-dialog/whats-new-dialog.component';
import { CHANGELOG } from '../models/changelog.const';
import type { WhatsNewDialogData } from '../models/whats-new-dialog-data.interface';
import { WHATS_NEW_DELAY } from '../models/whats-new-delay.const';
import { changelogHighlights, releasedChangelog } from '../utils/changelog-highlights';

/** At most this many highlights in the dialog. */
const WHATS_NEW_MAX = 5;

/** The newest shipped release of the changelog data; null while nothing shipped. */
const LATEST_RELEASE = releasedChangelog(CHANGELOG)[0]?.version ?? null;

/**
 * "What's new" (#424). The account remembers the newest release whose highlights the user saw
 * (`UserSettingsStore.whatsNewSeen`). `pending` is true while a shipped release newer than that has
 * highlights: the sidebar and the phone You list show a dot, and `watch()` opens the dialog once
 * per load, when no other dialog, focused field or hidden tab is in the way. Fix-only releases
 * never open it. A new account (onboarding still due, nothing stored) is marked as up to date
 * silently, so it sees the welcome tour instead; an existing account that never stored a release
 * sees the current highlights once. Opening the dialog marks the newest release as seen.
 */
export const WhatsNewStore = signalStore(
  { providedIn: 'root' },
  withState({ open: false }),
  withComputed((_, auth = inject(AuthStore), settings = inject(UserSettingsStore)) => {
    const newAccount = computed(
      () => settings.whatsNewSeen() === null && auth.user()?.onboardingCompletedAt === null,
    );
    /** Highlights of the releases the user has not seen yet. */
    const unseen = computed(() =>
      changelogHighlights(CHANGELOG, settings.whatsNewSeen(), WHATS_NEW_MAX),
    );
    return {
      latest: computed(() => LATEST_RELEASE),
      /** A new account whose "seen" release still has to be set to the current one. */
      newAccount,
      pending: computed(
        () =>
          auth.user() !== null && settings.whatsNewKnown() && !newAccount() && unseen().length > 0,
      ),
      unseen,
    };
  }),
  withMethods(
    (
      store,
      auth = inject(AuthStore),
      settings = inject(UserSettingsStore),
      dialogs = inject(DialogService),
      doc = inject(DOCUMENT),
      scope = inject(SessionScope),
    ) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      /** The user this load already looked for; once per user per load. */
      let lookedFor: string | null = null;

      function markSeen(): void {
        if (LATEST_RELEASE !== null) {
          void settings.setWhatsNewSeen(LATEST_RELEASE);
        }
      }

      async function open(): Promise<void> {
        if (store.open()) {
          return;
        }
        // Nothing new: the newest highlights, so the entry is never an empty dialog.
        const highlights = store.pending()
          ? store.unseen()
          : changelogHighlights(CHANGELOG, null, WHATS_NEW_MAX);
        markSeen();
        patchState(store, { open: true });
        try {
          await dialogs.open<WhatsNewDialogComponent, undefined, WhatsNewDialogData>(
            WhatsNewDialogComponent,
            { size: DIALOG_SIZE.Md, data: { highlights } },
          ).result;
        } finally {
          patchState(store, { open: false });
        }
      }

      function attempt(userId: string): void {
        timer = undefined;
        if (auth.user()?.id !== userId || !store.pending()) {
          return;
        }
        if (store.open() || isRatingBlocked(doc)) {
          timer = setTimeout(() => attempt(userId), WHATS_NEW_DELAY.Retry);
          return;
        }
        void open();
      }

      function stop(): void {
        clearTimeout(timer);
        timer = undefined;
      }

      scope.onEnd(() => {
        stop();
        lookedFor = null;
        patchState(store, { open: false });
      });

      return {
        open,
        stop,
        /**
         * Called by the shell whenever the user or the stored release changes: marks a new account
         * as up to date, or plans the dialog once per load when something is pending.
         */
        watch(): void {
          const user = auth.user();
          if (!user || !settings.whatsNewKnown()) {
            return;
          }
          if (store.newAccount()) {
            markSeen();
            return;
          }
          if (!store.pending() || lookedFor === user.id) {
            return;
          }
          lookedFor = user.id;
          stop();
          timer = setTimeout(() => attempt(user.id), WHATS_NEW_DELAY.Show);
        },
      };
    },
  ),
);
