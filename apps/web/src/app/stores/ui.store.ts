import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { UI_STORAGE_KEY } from './models/ui-storage-key.const';
import type { UiState } from './models/ui-state.interface';

const defaults: UiState = { singleKeyShortcuts: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads the stored preferences; anything unexpected (or a key of an older version) falls back to the default. */
function readState(): UiState {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage.getItem(UI_STORAGE_KEY) ?? 'null');
    if (!isRecord(parsed)) {
      return defaults;
    }
    // An older version also kept the feed view here; each feed remembers its own now (#284).
    const { singleKeyShortcuts } = parsed;
    return {
      singleKeyShortcuts:
        typeof singleKeyShortcuts === 'boolean' ? singleKeyShortcuts : defaults.singleKeyShortcuts,
    };
  } catch {
    return defaults;
  }
}

function persist(state: UiState): void {
  try {
    globalThis.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be blocked; the preference then lasts for this session only.
  }
}

/** Input preferences (single-key shortcuts), persisted in `localStorage`. The feed view is per feed (`FeedMemoryService`). */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState<UiState>(readState),
  withMethods((store) => ({
    /** Turns the single-character shortcuts on or off; applies at once and is kept per device. */
    setSingleKeyShortcuts(singleKeyShortcuts: boolean): void {
      patchState(store, { singleKeyShortcuts });
      persist({ singleKeyShortcuts });
    },
  })),
);
