import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { SafeStorage } from '../core/storage/safe-storage.service';
import { STORAGE_KEY } from '../core/storage/models/storage-key.const';
import type { UiState } from './models/ui-state.interface';

const defaults: UiState = { singleKeyShortcuts: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads the stored preferences; anything unexpected (or a key of an older version) falls back to the default. */
function readState(): UiState {
  const parsed = inject(SafeStorage).getJson<Record<string, unknown> | null>(
    STORAGE_KEY.Ui,
    (value): value is Record<string, unknown> => isRecord(value),
    null,
  );
  if (!parsed) {
    return defaults;
  }
  // An older version also kept the feed view here; each feed remembers its own now (#284).
  const { singleKeyShortcuts } = parsed;
  return {
    singleKeyShortcuts:
      typeof singleKeyShortcuts === 'boolean' ? singleKeyShortcuts : defaults.singleKeyShortcuts,
  };
}

/** Input preferences (single-key shortcuts), persisted in `localStorage`. The feed view is per feed (`FeedMemoryService`). */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState<UiState>(readState),
  withMethods((store, storage = inject(SafeStorage)) => ({
    /** Turns the single-character shortcuts on or off; applies at once and is kept per device. */
    setSingleKeyShortcuts(singleKeyShortcuts: boolean): void {
      patchState(store, { singleKeyShortcuts });
      // Storage can be blocked; the preference then lasts for this session only.
      storage.setJson(STORAGE_KEY.Ui, { singleKeyShortcuts } satisfies UiState);
    },
  })),
);
