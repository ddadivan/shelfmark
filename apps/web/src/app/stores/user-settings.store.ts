import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { TRASH_RETENTION_DEFAULT, type TrashRetentionDays } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsState } from './models/user-settings-state.interface';
import { TrashStore } from './trash.store';

const initialState: UserSettingsState = { trashRetentionDays: null, loading: false, error: false };

/**
 * The account preferences (`/api/me/settings`), cached for the whole app. Today: how long Trash
 * keeps deleted items. A change is optimistic and rolls back when the request fails; the Trash
 * list is reloaded after it, because the days left of every entry change. The session end
 * forgets everything and drops responses still in flight.
 */
export const UserSettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ trashRetentionDays }) => ({
    /** The retention to show: the account's, or the default until it is known. */
    retentionDays: computed<TrashRetentionDays>(
      () => trashRetentionDays() ?? TRASH_RETENTION_DEFAULT,
    ),
    loaded: computed(() => trashRetentionDays() !== null),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(USER_SETTINGS_API);
    const scope = inject(SessionScope);
    let epoch = 0;
    // Bumped by every change: a settings read that started before it must not overwrite it.
    let version = 0;
    let firstLoad: Promise<void> | null = null;

    async function fetchSettings(): Promise<void> {
      const started = epoch;
      const startedVersion = version;
      patchState(store, { loading: true, error: false });
      try {
        const settings = await firstValueFrom(api().get());
        if (started !== epoch) {
          return;
        }
        patchState(
          store,
          startedVersion === version
            ? { trashRetentionDays: settings.trashRetentionDays, loading: false }
            : { loading: false },
        );
      } catch {
        if (started === epoch) {
          patchState(store, { loading: false, error: store.trashRetentionDays() === null });
        }
      }
    }

    scope.onEnd(() => {
      epoch++;
      version++;
      firstLoad = null;
      patchState(store, initialState);
    });

    return {
      /** Loads the settings once; a failure can be retried by calling again. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        firstLoad ??= fetchSettings().finally(() => (firstLoad = null));
        return firstLoad;
      },

      /**
       * The Trash list knows the retention too, and it is what is known first. It is only used
       * while the settings have not told: a list that was asked for before the user changed the
       * setting would otherwise put the old value back when it arrives.
       */
      noteRetention(days: TrashRetentionDays): void {
        if (store.trashRetentionDays() === null) {
          patchState(store, { trashRetentionDays: days });
        }
      },

      /** Changes the retention at once; resolves false (and puts the old value back) when the request fails. */
      async setTrashRetention(days: TrashRetentionDays): Promise<boolean> {
        const previous = store.trashRetentionDays();
        if (previous === days) {
          return true;
        }
        const started = epoch;
        version++;
        patchState(store, { trashRetentionDays: days });
        try {
          const saved = await firstValueFrom(api().update({ trashRetentionDays: days }));
          if (started === epoch) {
            patchState(store, { trashRetentionDays: saved.trashRetentionDays });
            void injector.get(TrashStore).refresh();
          }
          return true;
        } catch {
          // Only while the value is still the optimistic one: a later choice must not be undone.
          if (started === epoch && store.trashRetentionDays() === days) {
            patchState(store, { trashRetentionDays: previous });
          }
          return false;
        }
      },
    };
  }),
);
