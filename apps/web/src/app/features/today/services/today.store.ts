import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { SAVED_WITHIN } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { RediscoverStore } from '../../rediscover/services/rediscover.store';
import { TODAY_LIMIT } from '../models/today-limit.const';
import type { TodayState } from '../models/today-state.interface';

const initialState: TodayState = {
  week: [],
  weekMore: false,
  weekLoaded: false,
  weekFailed: false,
  latest: [],
  latestLoaded: false,
  latestFailed: false,
};

/**
 * The Today page (Shelf `01-library.html`), page-scoped: "Back to these" is the due reminders
 * (`RemindersStore`), "Saved this week" one page of `GET /api/links?saved=week`, "From your shelf"
 * this week's Rediscover block (`RediscoverStore`), "All links" the newest links. Each part loads
 * on its own; a failed one shows its own retry and leaves the others.
 */
export const TodayStore = signalStore(
  withState(initialState),
  withComputed(({ week, weekMore }) => {
    const reminders = inject(RemindersStore);
    return {
      /** The due reminders to come back to, the longest due first. */
      back: computed(() => reminders.due().slice(0, TODAY_LIMIT.Back)),
      backCount: computed(() => reminders.due().length),
      backLoaded: computed(() => reminders.loaded() || reminders.error()),
      backFailed: computed(() => reminders.error()),
      weekRows: computed(() => week().slice(0, TODAY_LIMIT.WeekRows)),
      /** "12", or "100+" when the week holds more than one page. */
      weekCount: computed(() => `${week().length}${weekMore() ? '+' : ''}`),
      /** How many of this week's links already sit in a folder. */
      weekFiled: computed(() => week().filter((link) => link.folderId !== null).length),
    };
  }),
  withMethods((store) => {
    const api = inject(LINKS_API);
    const reminders = inject(RemindersStore);
    const rediscover = inject(RediscoverStore);
    const folders = inject(FoldersStore);

    async function loadWeek(): Promise<void> {
      patchState(store, { weekFailed: false });
      try {
        const page = await firstValueFrom(
          api.list({ saved: SAVED_WITHIN.Week, limit: TODAY_LIMIT.WeekPage }),
        );
        patchState(store, {
          week: page.items,
          weekMore: page.nextCursor !== null,
          weekLoaded: true,
        });
      } catch {
        patchState(store, { weekLoaded: true, weekFailed: true });
      }
    }

    async function loadLatest(): Promise<void> {
      patchState(store, { latestFailed: false });
      try {
        const page = await firstValueFrom(api.list({ limit: TODAY_LIMIT.Latest }));
        patchState(store, { latest: page.items, latestLoaded: true });
      } catch {
        patchState(store, { latestLoaded: true, latestFailed: true });
      }
    }

    return {
      /** Opening the page: every part, plus the folders its rows and cards name. */
      load(): Promise<unknown> {
        return Promise.all([
          reminders.open(),
          rediscover.load(),
          folders.load(),
          loadWeek(),
          loadLatest(),
        ]);
      },
      retryBack: (): Promise<void> => reminders.open(),
      retryWeek: loadWeek,
      retryLatest: loadLatest,
    };
  }),
);
