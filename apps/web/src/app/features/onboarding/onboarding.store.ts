import { computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { LinkActionsService } from '../links/link-actions.service';
import { OnboardingDialogComponent } from './onboarding-dialog.component';
import { ONBOARDING_API } from './models/onboarding-api.const';
import { ONBOARDING_RESULT } from './models/onboarding-result.const';
import type { OnboardingResult } from './models/onboarding-result.type';
import type { OnboardingState } from './models/onboarding-state.interface';

const initialState: OnboardingState = { open: false, resetting: false };

/**
 * The welcome tour. It is due while the signed-in user's `onboardingCompletedAt` is `null`; a
 * missing flag (or a guest) never opens it. Every way out of the dialog completes it: the flag is
 * patched at once, then the server is told, and a failed request is silent (the dialog is simply
 * due again on the next load). "Show welcome again" resets the flag, which opens the dialog.
 */
export const OnboardingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((_, auth = inject(AuthStore)) => ({
    due: computed(() => auth.user()?.onboardingCompletedAt === null),
  })),
  withMethods(
    (
      store,
      auth = inject(AuthStore),
      api = inject(ONBOARDING_API),
      dialogs = inject(DialogService),
      actions = inject(LinkActionsService),
      toasts = inject(ToastService),
      transloco = inject(TranslocoService),
    ) => {
      async function complete(userId: string): Promise<void> {
        auth.setOnboardingCompletedAt(new Date().toISOString());
        try {
          const { onboardingCompletedAt } = await api.complete();
          // A sign-out or a switch to another user meanwhile must not touch the new session.
          // A reset meanwhile (flag back to null) wins over this older answer.
          const flag = auth.user()?.onboardingCompletedAt;
          if (auth.user()?.id === userId && flag !== null && flag !== undefined) {
            auth.setOnboardingCompletedAt(onboardingCompletedAt);
          }
        } catch {
          // Stay closed; the server still says "due", so the next load shows the dialog again.
        }
      }

      async function show(userId: string): Promise<void> {
        patchState(store, { open: true });
        let result: OnboardingResult;
        try {
          result =
            (await dialogs.open<OnboardingDialogComponent, OnboardingResult>(
              OnboardingDialogComponent,
              { size: DIALOG_SIZE.Md, autoFocus: '.onboarding__next button' },
            ).result) ?? ONBOARDING_RESULT.Skipped;
        } finally {
          patchState(store, { open: false });
        }
        if (auth.user()?.id !== userId) {
          return;
        }
        const completing = complete(userId);
        if (result === ONBOARDING_RESULT.AddLink) {
          await actions.addLink();
        }
        await completing;
      }

      return {
        /** Opens the dialog when it is due and not open yet; the shell calls it from an effect. */
        openIfDue(): void {
          const user = auth.user();
          if (!store.due() || store.open() || !user) {
            return;
          }
          // A dialog that cannot open leaves the app as it was (`open` is reset in `show`).
          show(user.id).catch(() => undefined);
        },
        /** Settings, "Show welcome again": clears the flag on the server, then the dialog opens. */
        async reset(): Promise<void> {
          if (store.resetting()) {
            return;
          }
          patchState(store, { resetting: true });
          try {
            await api.reset();
            auth.setOnboardingCompletedAt(null);
          } catch {
            toasts.show({
              kind: TOAST_KIND.Error,
              text: transloco.translate('settings.welcome.error'),
            });
          } finally {
            patchState(store, { resetting: false });
          }
        },
      };
    },
  ),
);
