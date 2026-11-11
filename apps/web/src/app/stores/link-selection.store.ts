import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { selectRange } from '../features/links/selection/select-range';
import type { LinkSelectionState } from './models/link-selection-state.interface';

const initialState: LinkSelectionState = { ids: [], anchor: null };

/**
 * The links picked for a bulk action in the feed (#267). App-wide so the shell can lift toasts
 * above the bulk bar, but owned by the library page: it clears the selection when the view, the
 * filter or the route changes. Order-dependent operations (Shift-click range, select all) take the
 * order of the links on screen from the caller.
 */
export const LinkSelectionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ ids }) => ({
    idSet: computed(() => new Set(ids())),
    count: computed(() => ids().length),
    selecting: computed(() => ids().length > 0),
  })),
  withMethods((store) => ({
    has(id: string): boolean {
      return store.idSet().has(id);
    },

    /**
     * Toggles one link. With `range` (Shift), every link between the anchor and this one in `order`
     * is selected instead (a range only adds), and the anchor stays where it was.
     */
    toggle(id: string, order: readonly string[], range = false): void {
      const current = store.idSet();
      if (range && store.anchor() !== null) {
        const span = selectRange(order, store.anchor(), id);
        patchState(store, { ids: [...store.ids(), ...span.filter((item) => !current.has(item))] });
        return;
      }
      patchState(store, {
        ids: current.has(id) ? store.ids().filter((item) => item !== id) : [...store.ids(), id],
        anchor: id,
      });
    },

    /** Selects every link in `order` (the links on screen). */
    selectAll(order: readonly string[]): void {
      const current = store.idSet();
      patchState(store, { ids: [...store.ids(), ...order.filter((id) => !current.has(id))] });
    },

    /** Keeps only the ids that are still on screen (after a delete or a move out of the view). */
    keep(order: readonly string[]): void {
      const present = new Set(order);
      if (store.ids().some((id) => !present.has(id))) {
        patchState(store, { ids: store.ids().filter((id) => present.has(id)) });
      }
    },

    clear(): void {
      if (store.ids().length > 0 || store.anchor() !== null) {
        patchState(store, initialState);
      }
    },
  })),
);
