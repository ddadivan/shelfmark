import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  FOLDER_DEFAULT_COLOUR,
  LIBRARY_SETTINGS_DEFAULT,
  LINK_OPEN_TARGET,
  TRASH_RETENTION_DEFAULT,
  USER_LIMIT,
  type FolderColour,
  type FolderEmoji,
  type HexColour,
  type LanguageSettings,
  type LibrarySettings,
  type TrashRetentionDays,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import type { Appearance } from '../core/theme/models/appearance.type';
import { ThemeService } from '../core/theme/theme.service';
import { LocaleService } from '../core/i18n/locale.service';
import { SessionScope } from '../core/auth/session-scope.service';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import {
  appearanceOf,
  appended,
  languageOf,
  libraryOf,
  sameAppearance,
  sameLanguage,
} from './user-settings-mappers';
import type { OwnListField } from './models/own-list-field.type';
import type { UserSettingsState } from './models/user-settings-state.interface';
import { TrashStore } from './trash.store';

const initialState: UserSettingsState = {
  trashRetentionDays: null,
  folderColours: null,
  pauseHistory: null,
  customColours: [],
  customEmoji: [],
  library: null,
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
  withComputed(({ trashRetentionDays, folderColours, pauseHistory, library }) => ({
    /** The retention to show: the account's, or the default until it is known. */
    retentionDays: computed<TrashRetentionDays>(
      () => trashRetentionDays() ?? TRASH_RETENTION_DEFAULT,
    ),
    loaded: computed(() => trashRetentionDays() !== null),
    /** Folders show their colour (default until the settings say otherwise). */
    coloursOn: computed(() => folderColours() ?? true),
    /** Opens are not recorded (off until the settings say otherwise). */
    historyPaused: computed(() => pauseHistory() ?? false),
    /** Settings › Library › Viewing and Saving: the account's, or the defaults until they are known. */
    libraryShown: computed<LibrarySettings>(() => library() ?? LIBRARY_SETTINGS_DEFAULT),
    /** Links of cards and rows open in a new tab (default) or the same tab. */
    openInNewTab: computed(
      () =>
        (library()?.openLinksIn ?? LIBRARY_SETTINGS_DEFAULT.openLinksIn) ===
        LINK_OPEN_TARGET.NewTab,
    ),
    /** Link counts next to the sidebar entries and folders. */
    countsShown: computed(
      () => library()?.showFolderCounts ?? LIBRARY_SETTINGS_DEFAULT.showFolderCounts,
    ),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(USER_SETTINGS_API);
    const scope = inject(SessionScope);
    const theme = inject(ThemeService);
    const locale = inject(LocaleService);
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
          if (settings.appearanceSaved) {
            // The account wins over the copy in this browser (it follows the user to every device).
            theme.apply(appearanceOf(settings));
          } else if (theme.hasStoredAppearance()) {
            // Never chosen on the account, but this browser has a theme (from before the account
            // kept one): keep it and save it once, silently; a failure retries on the next load.
            firstValueFrom(api().update(theme.appearance())).catch(() => undefined);
          }
          // Neither has one: the defaults already show, and nothing is written to the browser.
          if (settings.languageSaved) {
            locale.apply(languageOf(settings));
          } else if (locale.hasStoredLanguage()) {
            // A language chosen in this browser (as a guest, or before the account kept it): keep
            // it and save it once, silently. Otherwise "Match my browser" already applies.
            firstValueFrom(api().update(locale.settings())).catch(() => undefined);
          }
        }
        patchState(
          store,
          startedVersion === version
            ? {
                trashRetentionDays: settings.trashRetentionDays,
                folderColours: settings.folderColours,
                pauseHistory: settings.pauseHistory,
                customColours: settings.customColours,
                customEmoji: settings.customEmoji,
                library: libraryOf(settings),
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

    /**
     * Counts the saves of each own list (colours #350, emoji #363): only the newest save of a list
     * may write its answer back.
     */
    const listSaves: Record<OwnListField, number> = { customColours: 0, customEmoji: 0 };

    /** Saves a whole own list optimistically; a failure puts the previous list back. */
    async function saveList<F extends OwnListField>(
      field: F,
      previous: UserSettingsState[F],
      next: UserSettingsState[F],
    ): Promise<boolean> {
      if (previous.length === next.length && previous.every((item, i) => item === next[i])) {
        return true;
      }
      const started = epoch;
      const mine = ++listSaves[field];
      version++;
      patchState(store, { [field]: next });
      try {
        const saved = await firstValueFrom(api().update({ [field]: next }));
        // A newer add or remove already changed the list: its answer is the one that counts.
        if (started === epoch && mine === listSaves[field]) {
          patchState(store, { [field]: saved[field] });
        }
        return true;
      } catch {
        if (started === epoch && mine === listSaves[field]) {
          patchState(store, { [field]: previous });
        }
        return false;
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
        if (
          store.loaded() &&
          store.folderColours() !== null &&
          store.pauseHistory() !== null &&
          store.library() !== null
        ) {
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
      shownColour(colour: FolderColour | string): FolderColour | string {
        return (store.folderColours() ?? true) ? colour : FOLDER_DEFAULT_COLOUR;
      },

      /**
       * Keeps an own colour as a swatch (#335): at the end, once (an old copy moves to the end), at
       * most `USER_LIMIT.CustomColoursMax` (the oldest goes). Saved at once; resolves false (and
       * puts the list back) when the request fails.
       */
      async addCustomColour(colour: HexColour): Promise<boolean> {
        const previous = store.customColours();
        return saveList(
          'customColours',
          previous,
          appended(previous, colour, USER_LIMIT.CustomColoursMax),
        );
      },

      /** Forgets an own colour (folders and themes that wear it keep it). */
      async removeCustomColour(colour: HexColour): Promise<boolean> {
        const previous = store.customColours();
        return saveList(
          'customColours',
          previous,
          previous.filter((item) => item !== colour),
        );
      },

      /**
       * Keeps an own emoji for the picker's "Yours" (#363): at the end, once, at most
       * `USER_LIMIT.CustomEmojiMax` (the oldest goes). Saved at once; resolves false (and puts the
       * list back) when the request fails.
       */
      async addCustomEmoji(emoji: FolderEmoji): Promise<boolean> {
        const previous = store.customEmoji();
        return saveList(
          'customEmoji',
          previous,
          appended(previous, emoji, USER_LIMIT.CustomEmojiMax),
        );
      },

      /** Forgets an own emoji (folders that wear it keep it). */
      async removeCustomEmoji(emoji: FolderEmoji): Promise<boolean> {
        const previous = store.customEmoji();
        return saveList(
          'customEmoji',
          previous,
          previous.filter((item) => item !== emoji),
        );
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
       * Changes the theme, the Custom theme, the Animations setting or a text, layout or card
       * option at once (ThemeService applies
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
            theme.apply(appearanceOf(saved));
          }
          return true;
        } catch {
          if (started === epoch && sameAppearance(theme.appearance(), next)) {
            theme.apply(previous);
          }
          return false;
        }
      },

      /**
       * Changes the interface language, date format, clock, week start or spell-check at once
       * (LocaleService switches the whole app without a reload) and saves it on the account;
       * resolves false (and puts the old settings back, unless a later change replaced them) when
       * the request fails.
       */
      async setLanguage(change: Partial<LanguageSettings>): Promise<boolean> {
        const previous = locale.settings();
        const next: LanguageSettings = { ...previous, ...change };
        if (sameLanguage(previous, next)) {
          return true;
        }
        const started = epoch;
        version++;
        locale.apply(next);
        try {
          const saved = await firstValueFrom(api().update(change));
          if (started === epoch && sameLanguage(locale.settings(), next)) {
            locale.apply(languageOf(saved));
          }
          return true;
        } catch {
          if (started === epoch && sameLanguage(locale.settings(), next)) {
            locale.apply(previous);
          }
          return false;
        }
      },

      /**
       * Changes Settings › Library choices at once (the feed, the sidebar and the add-link dialog
       * follow) and saves them on the account; resolves false (and puts the changed fields back,
       * unless a later change replaced them) when the request fails.
       */
      async setLibrary(change: Partial<LibrarySettings>): Promise<boolean> {
        const previous = store.libraryShown();
        const keys = (Object.keys(change) as (keyof LibrarySettings)[]).filter(
          (key) => change[key] !== undefined && change[key] !== previous[key],
        );
        if (keys.length === 0) {
          return true;
        }
        const next: LibrarySettings = { ...previous, ...change };
        const started = epoch;
        version++;
        patchState(store, { library: next });
        const unchangedSince = (): boolean => {
          const current = store.libraryShown();
          return keys.every((key) => current[key] === next[key]);
        };
        try {
          const saved = await firstValueFrom(api().update(change));
          if (started === epoch && unchangedSince()) {
            patchState(store, { library: libraryOf(saved) });
          }
          return true;
        } catch {
          if (started === epoch && unchangedSince()) {
            const restored: Partial<LibrarySettings> = {};
            for (const key of keys) {
              Object.assign(restored, { [key]: previous[key] });
            }
            patchState(store, { library: { ...store.libraryShown(), ...restored } });
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
