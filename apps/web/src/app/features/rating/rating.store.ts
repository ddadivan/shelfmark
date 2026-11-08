import { DOCUMENT } from '@angular/common';
import { computed, inject, signal } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { FeedbackMilestone } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { RATING_API } from './models/rating-api.const';
import { RATING_DELAY } from './models/rating-delay.const';
import type { RatingDialogData } from './models/rating-dialog-data.interface';
import type { RatingState } from './models/rating-state.interface';
import { isRatingBlocked } from './rating-blockers';
import { RatingDialogComponent } from './rating-dialog.component';

const initialState: RatingState = { open: false };

/**
 * The app rating (story 24). A signed-in, non-demo user who finished the onboarding is
 * `eligible`. For them `watch()` waits 5 s, asks the server which milestone is due (the server
 * knows `createdAt` and the answers) and opens the dialog, unless a modal, a focused text field
 * or a hidden tab is in the way, in which case it asks again later. One look per load and user;
 * a milestone answered or skipped is never due again. Every failure is silent: the next load asks
 * again.
 */
export const RatingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((_, auth = inject(AuthStore)) => ({
    eligible: computed(() => {
      const user = auth.user();
      return user !== null && !user.isDemo && typeof user.onboardingCompletedAt === 'string';
    }),
  })),
  withMethods(
    (
      store,
      auth = inject(AuthStore),
      api = inject(RATING_API),
      dialogs = inject(DialogService),
      doc = inject(DOCUMENT),
    ) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      /** The user the current look belongs to; null while idle. */
      let watching: string | null = null;
      /** The last user a look was started for; `stop()` keeps it, so it is once per user per load. */
      let lastLookedUserId: string | null = null;

      function stillWatching(userId: string): boolean {
        return watching === userId && auth.user()?.id === userId;
      }

      function schedule(userId: string, delay: number): void {
        timer = setTimeout(() => {
          timer = undefined;
          attempt(userId).catch(() => undefined);
        }, delay);
      }

      async function show(userId: string, milestone: FeedbackMilestone): Promise<void> {
        const scored = signal(false);
        const data: RatingDialogData = { milestone, scored };
        patchState(store, { open: true });
        try {
          await dialogs.open<RatingDialogComponent, undefined, RatingDialogData>(
            RatingDialogComponent,
            { size: DIALOG_SIZE.Md, data, autoFocus: 'dialog' },
          ).result;
        } finally {
          patchState(store, { open: false });
        }
        // Not now, Esc and the scrim: the skip is recorded so the milestone is not asked again.
        // After a failed score save the server may answer 409 (score mismatch); that is swallowed.
        if (!scored() && auth.user()?.id === userId) {
          await api.record({ milestone, score: null }).catch(() => undefined);
        }
      }

      async function attempt(userId: string): Promise<void> {
        if (!stillWatching(userId)) {
          return;
        }
        if (store.open() || isRatingBlocked(doc)) {
          schedule(userId, RATING_DELAY.Retry);
          return;
        }
        let milestone: FeedbackMilestone | null;
        try {
          milestone = await api.prompt();
        } catch {
          return;
        }
        if (!stillWatching(userId) || milestone === null) {
          return;
        }
        if (store.open() || isRatingBlocked(doc)) {
          schedule(userId, RATING_DELAY.Retry);
          return;
        }
        await show(userId, milestone);
      }

      return {
        /** Starts the look for the signed-in user; no-op when not eligible or already done for this user. */
        watch(): void {
          const user = auth.user();
          if (!store.eligible() || !user || lastLookedUserId === user.id) {
            return;
          }
          // Another user replaces a look that is still waiting.
          clearTimeout(timer);
          watching = user.id;
          lastLookedUserId = user.id;
          schedule(user.id, RATING_DELAY.Show);
        },
        /** Cancels a pending look (sign-out, demo, onboarding shown again). */
        stop(): void {
          clearTimeout(timer);
          timer = undefined;
          watching = null;
        },
      };
    },
  ),
);
