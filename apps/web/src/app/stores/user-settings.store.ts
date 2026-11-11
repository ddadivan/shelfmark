import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  FOLDER_DEFAULT_COLOUR,
  TRASH_RETENTION_DEFAULT,
  type FolderColour,
  type TrashRetentionDays,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import type { Appearance } from '../core/theme/models/appearance.type';
import { ThemeService } from '../core/theme/theme.service';
import { SessionScope } from '../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import type { UserSettingsState } from './models/user-settings-state.interface';
import { TrashStore } from './trash.store';

function sameAppearance(a: Appearance, b: Appearance): boolean {
  return (
    a.theme === b.theme &&
    a.motion === b.motion &&
    a.customTheme.base === b.customTheme.base &&
    a.customTheme.accent === b.customTheme.accent &&
    a.customTheme.background === b.customTheme.background &&
    a.customTheme.corners === b.customTheme.corners
  );
}

const initialState: UserSettingsState = {
  trashRetentionDays: null,
  folderColours: null,
  pauseHistory: null,
  loading: false,
  error: false,
};

/**
 * The account preferences (`/api/me/settings`), cached for the whole app. Today: how long Trash
 * keeps deleted items, folder colours, whether Recently opened records opens, and the appearance
 * (theme, Custom theme, Animations), which lives in ThemeService and is applied from here. A change is optimistic and rolls back when the request fails; the Trash
 * list is reloaded after it, because the days left of every entry change. The session end
 * forgets everything and drops responses still in flight.
 */
export const UserSettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ trashRetentionDays, folderColours, pauseHistory }) => ({
    /** The retention to show: the account's, or the default until it is known. */
    retentionDays: computed<TrashRetentionDays>(
      () => trashRetentionDays() ?? TRASH_RETENTION_DEFAULT,
    ),
    loaded: computed(() => trashRetentionDays() !== null),
    /** Folders show their colour (default until the settings say otherwise). */
    coloursOn: computed(() => folderColours() ?? true),
    /** Opens are not recorded (off until the settings say otherwise). */
    historyPaused: computed(() => pauseHistory() ?? false),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(USER_SETTINGS_API);
    const scope = inject(SessionScope);
    const theme = inject(ThemeService);
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
        if (startedVersion === version) {
          // The account wins over the copy in this browser (it follows the user to every device).
          theme.apply({
            theme: settings.theme,
            customTheme: settings.customTheme,
            motion: settings.motion,
          });
        }
        patchState(
          store,
          startedVersion === version
            ? {
                trashRetentionDays: settings.trashRetentionDays,
                folderColours: settings.folderColours,
                pauseHistory: settings.pauseHistory,
                loading: false,
              }
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
        if (store.loaded() && store.folderColours() !== null && store.pauseHistory() !== null) {
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

      /** The colour a folder tile is drawn in: its own, or graphite when "Folder colours" is off. */
      shownColour(colour: FolderColour): FolderColour {
        return (store.folderColours() ?? true) ? colour : FOLDER_DEFAULT_COLOUR;
      },

      /** Switches "Folder colours" at once; resolves false (and puts the old value back) when the request fails. */
      async setFolderColours(on: boolean): Promise<boolean> {
        const previous = store.folderColours();
        if ((previous ?? true) === on) {
          return true;
        }
        const started = epoch;
        version++;
        patchState(store, { folderColours: on });
        try {
          const saved = await firstValueFrom(api().update({ folderColours: on }));
          if (started === epoch) {
            patchState(store, { folderColours: saved.folderColours });
          }
          return true;
        } catch {
          if (started === epoch && store.folderColours() === on) {
            patchState(store, { folderColours: previous });
          }
          return false;
        }
      },

      /**
       * Pauses or resumes the history at once (the server then skips or records opens); resolves
       * false (and puts the old value back) when the request fails.
       */
      async setPauseHistory(paused: boolean): Promise<boolean> {
        const previous = store.pauseHistory();
        if ((previous ?? false) === paused) {
          return true;
        }
        const started = epoch;
        version++;
        patchState(store, { pauseHistory: paused });
        try {
          const saved = await firstValueFrom(api().update({ pauseHistory: paused }));
          if (started === epoch) {
            patchState(store, { pauseHistory: saved.pauseHistory });
          }
          return true;
        } catch {
          if (started === epoch && store.pauseHistory() === paused) {
            patchState(store, { pauseHistory: previous });
          }
          return false;
        }
      },

      /**
       * Changes the theme, the Custom theme or the Animations setting at once (ThemeService applies
       * it to the whole app) and saves it on the account; resolves false (and puts the old
       * appearance back, unless a later change replaced it) when the request fails.
       */
      async setAppearance(change: Partial<Appearance>): Promise<boolean> {
        const previous = theme.appearance();
        const next: Appearance = { ...previous, ...change };
        if (sameAppearance(previous, next)) {
          return true;
        }
        const started = epoch;
        version++;
        theme.apply(next);
        try {
          const saved = await firstValueFrom(api().update(change));
          if (started === epoch && sameAppearance(theme.appearance(), next)) {
            theme.apply({
              theme: saved.theme,
              customTheme: saved.customTheme,
              motion: saved.motion,
            });
          }
          return true;
        } catch {
          if (started === epoch && sameAppearance(theme.appearance(), next)) {
            theme.apply(previous);
          }
          return false;
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
