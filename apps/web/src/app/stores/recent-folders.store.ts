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
import { SafeStorage } from '../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../core/storage/models/storage-key.const';
import { FoldersStore } from './folders.store';
import type { RecentFoldersState } from './models/recent-folders-state.interface';
import { parseRecentFolders, pushRecentFolder, serializeRecentFolders } from './recent-folders';

function read(): RecentFoldersState {
  return { ids: parseRecentFolders(inject(SafeStorage).getString(STORAGE_KEY.RecentFolders)) };
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
  withMethods((store, storage = inject(SafeStorage)) => ({
    /** `target` (a folder id, `null` for Unsorted) was just used: it goes first. */
    record(target: string | null): void {
      const ids = pushRecentFolder(store.ids(), target);
      patchState(store, { ids });
      // Storage full or blocked (private mode): the list lasts until the page reloads.
      storage.set(STORAGE_KEY.RecentFolders, serializeRecentFolders(ids));
    },
  })),
  withHooks({
    onInit: (store, scope = inject(SessionScope)) => {
      scope.onEnd(() => patchState(store, { ids: [] }));
    },
  }),
);
