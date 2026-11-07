import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { UI_STORAGE_KEY } from './models/ui-storage-key.const';
import type { UiState } from './models/ui-state.interface';
import { UI_VIEW } from './models/ui-view.const';
import type { UiView } from './models/ui-view.type';

const defaults: UiState = { view: UI_VIEW.Cards, recentVisible: true };

function isUiView(value: unknown): value is UiView {
  return Object.values(UI_VIEW).some((view) => view === value);
}

/** Reads the stored preferences; anything unexpected falls back to the default for that field. */
function readState(): UiState {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage.getItem(UI_STORAGE_KEY) ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) {
      return defaults;
    }
    const { view, recentVisible } = parsed as Record<string, unknown>;
    return {
      view: isUiView(view) ? view : defaults.view,
      recentVisible: typeof recentVisible === 'boolean' ? recentVisible : defaults.recentVisible,
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

/** Layout preferences (feed view, recent panel), persisted in `localStorage`. */
export const UiStore = signalStore(
  { providedIn: 'root' },
  withState<UiState>(readState),
  withMethods((store) => ({
    setView(view: UiView): void {
      patchState(store, { view });
      persist({ view, recentVisible: store.recentVisible() });
    },
    setRecentVisible(recentVisible: boolean): void {
      patchState(store, { recentVisible });
      persist({ view: store.view(), recentVisible });
    },
  })),
);
