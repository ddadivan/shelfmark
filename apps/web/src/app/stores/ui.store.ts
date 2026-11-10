import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { isUiView } from './is-ui-view';
import { UI_STORAGE_KEY } from './models/ui-storage-key.const';
import type { UiState } from './models/ui-state.interface';
import { UI_VIEW } from './models/ui-view.const';
import type { UiView } from './models/ui-view.type';

const defaults: UiState = { view: UI_VIEW.Cards, singleKeyShortcuts: true };

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
    const { view, singleKeyShortcuts } = parsed;
    return {
      view: isUiView(view) ? view : defaults.view,
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

/** Layout and input preferences (feed view, single-key shortcuts), persisted in `localStorage`. */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState<UiState>(readState),
  withMethods((store) => ({
    setView(view: UiView): void {
      patchState(store, { view });
      persist({ view, singleKeyShortcuts: store.singleKeyShortcuts() });
    },
    /** Turns the single-character shortcuts on or off; applies at once and is kept per device. */
    setSingleKeyShortcuts(singleKeyShortcuts: boolean): void {
      patchState(store, { singleKeyShortcuts });
      persist({ view: store.view(), singleKeyShortcuts });
    },
  })),
);
