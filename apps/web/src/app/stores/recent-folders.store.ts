import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { SessionScope } from '../core/auth/session-scope.service';
import { RECENT_FOLDERS_STORAGE_KEY } from '../core/auth/models/recent-folders-storage-key.const';
import { FoldersStore } from './folders.store';
import type { RecentFoldersState } from './models/recent-folders-state.interface';
import { parseRecentFolders, pushRecentFolder, serializeRecentFolders } from './recent-folders';

function read(): RecentFoldersState {
  try {
    return { ids: parseRecentFolders(globalThis.localStorage.getItem(RECENT_FOLDERS_STORAGE_KEY)) };
  } catch {
    return { ids: [] };
  }
}

function persist(ids: readonly (string | null)[]): void {
  try {
    globalThis.localStorage.setItem(RECENT_FOLDERS_STORAGE_KEY, serializeRecentFolders(ids));
  } catch {
    // Storage full or blocked (private mode): the list lasts until the page reloads.
  }
}

/**
 * The folders the user moved links into lately (the "Recent" group of the folder pickers: "Move
 * to" and the side-by-side picker), most recent first, per device in `localStorage`. The session
 * end (`SessionScope`) clears the key and the list. `targets` leaves out folders that are gone.
 */
export const RecentFoldersStore = signalStore(
  { providedIn: 'root' },
  withState<RecentFoldersState>(read),
  withComputed(({ ids }, folders = inject(FoldersStore)) => ({
    /** The remembered ids that still exist (Unsorted, `null`, always does). */
    targets: computed(() =>
      ids().filter((id) => id === null || folders.entityMap()[id] !== undefined),
    ),
  })),
  withMethods((store) => ({
    /** `target` (a folder id, `null` for Unsorted) was just used: it goes first. */
    record(target: string | null): void {
      const ids = pushRecentFolder(store.ids(), target);
      patchState(store, { ids });
      persist(ids);
    },
  })),
  withHooks({
    onInit: (store, scope = inject(SessionScope)) => {
      scope.onEnd(() => patchState(store, { ids: [] }));
    },
  }),
);
