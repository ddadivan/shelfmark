import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { CLEANUP_API } from '../models/cleanup-api.const';
import type { CleanupSummaryState } from '../models/cleanup-summary-state.interface';

const initialState: CleanupSummaryState = { summary: null };

/**
 * The clean-up entry card on All links (AI-5): its counts, loaded once per session and again after
 * a clean-up run or its Undo. The × hides the card at once (for a month on the server) and puts it
 * back when the request fails. A failed read shows no card; the session end forgets it.
 */
export const CleanupSummaryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ summary }) => ({
    /** Show the card: something found and not dismissed lately. */
    show: computed(() => summary()?.show === true),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    let loading: Promise<void> | null = null;
    let epoch = 0;

    inject(SessionScope).onEnd(() => {
      epoch++;
      loading = null;
      patchState(store, initialState);
    });

    function fetch(): Promise<void> {
      const source = injector.get(CLEANUP_API, null);
      if (!source) {
        return Promise.resolve();
      }
      const started = epoch;
      return firstValueFrom(source.getSummary())
        .then((summary) => {
          if (started === epoch) {
            patchState(store, { summary });
          }
        })
        .catch(() => undefined);
    }

    return {
      /** Reads the counts once per session. */
      load(): Promise<void> {
        loading ??= fetch();
        return loading;
      },

      /** Reads the counts again after the library was cleaned up (only once loaded). */
      refresh(): Promise<void> {
        return store.summary() === null ? Promise.resolve() : fetch();
      },

      /** The × of the card. */
      async dismiss(): Promise<void> {
        const before = store.summary();
        if (!before) {
          return;
        }
        patchState(store, { summary: { ...before, show: false } });
        try {
          await firstValueFrom(injector.get(CLEANUP_API).dismissCard());
        } catch {
          patchState(store, { summary: before });
        }
      },
    };
  }),
);
