import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ADMIN_STATS_LIMIT } from '@shelfmark/contracts';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { FEEDBACK_LOAD_STATE } from '../../feedback/models/feedback-load-state.const';
import { ADMIN_API } from '../models/admin-api.const';
import type { AdminStatsState } from '../models/admin-stats-state.interface';

const initialState: AdminStatsState = { stats: null, phase: FEEDBACK_LOAD_STATE.Idle };

/**
 * The author's usage stats (#333). `load()` asks `/api/admin/stats` (computed on request); a
 * refresh keeps the last numbers on screen until the answer comes. Dropped when the session ends.
 */
export const AdminStatsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ stats, phase }) => ({
    loading: computed(() => phase() === FEEDBACK_LOAD_STATE.Loading),
    failed: computed(() => phase() === FEEDBACK_LOAD_STATE.Failed),
    /** Fewer real users than the minimum group size: shares and groups are all hidden. */
    tooFew: computed(() => {
      const current = stats();
      return current !== null && current.overview.realUsers < ADMIN_STATS_LIMIT.MinGroup;
    }),
  })),
  withMethods((store, api = inject(ADMIN_API), scope = inject(SessionScope)) => {
    /** Bumped by every load and by `clear()`: an older answer is dropped. */
    let epoch = 0;

    function clear(): void {
      epoch += 1;
      patchState(store, initialState);
    }
    scope.onEnd(clear);

    return {
      /** Loads the stats (also the retry and the refresh). */
      async load(): Promise<void> {
        epoch += 1;
        const startedIn = epoch;
        patchState(store, { phase: FEEDBACK_LOAD_STATE.Loading });
        try {
          const stats = await api.stats();
          if (startedIn === epoch) {
            patchState(store, { stats, phase: FEEDBACK_LOAD_STATE.Loaded });
          }
        } catch {
          if (startedIn === epoch) {
            patchState(store, { phase: FEEDBACK_LOAD_STATE.Failed });
          }
        }
      },
      clear,
    };
  }),
);
