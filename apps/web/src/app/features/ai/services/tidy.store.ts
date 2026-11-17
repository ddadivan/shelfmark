import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { TidyApplyItem, TidyItem } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { AI_API } from '../models/ai-api.const';
import type { TidyRowView } from '../models/tidy-row-view.interface';
import type { TidyState } from '../models/tidy-state.interface';
import { tidyChips } from '../utils/tidy-chips';

const initialState: TidyState = {
  items: [],
  total: 0,
  loading: false,
  loaded: false,
  deselected: [],
  skipped: [],
  applying: false,
};

/** `items` without the suggestion `id`; a link left without suggestions leaves the list. */
function withoutSuggestion(items: readonly TidyItem[], id: string): TidyItem[] {
  return items.flatMap((item) => {
    const suggestions = item.suggestions.filter((suggestion) => suggestion.id !== id);
    return suggestions.length > 0 ? [{ ...item, suggestions }] : [];
  });
}

/**
 * The Tidy review page (AI-2, provided by the page): the links in Unsorted with their suggestions,
 * which chips the user left out and which links they skipped (both only on this page; chips start
 * selected), and what one apply run sends: per link the ids still selected. A link with no chip
 * selected is not sent.
 */
export const TidyStore = signalStore(
  withState(initialState),
  withComputed((store) => {
    const folders = inject(FoldersStore);
    const settings = inject(UserSettingsStore);
    const rows = computed<TidyRowView[]>(() => {
      const deselected = new Set(store.deselected());
      const skipped = new Set(store.skipped());
      const known = folders.entityMap();
      return store.items().map((item) => ({
        link: item.link,
        chips: tidyChips(item.suggestions, known, deselected, (colour) =>
          settings.shownColour(colour),
        ),
        skipped: skipped.has(item.link.id),
      }));
    });
    const applyItems = computed<TidyApplyItem[]>(() =>
      rows().flatMap((row) => {
        const suggestionIds = row.chips.filter((chip) => chip.selected).map((chip) => chip.id);
        return row.skipped || suggestionIds.length === 0
          ? []
          : [{ linkId: row.link.id, suggestionIds }];
      }),
    );
    return {
      rows,
      applyItems,
      /** "Apply to {n} links". */
      applyCount: computed(() => applyItems().length),
      /** "Nothing to tidy": nothing listed, or every link skipped. */
      empty: computed(() => store.loaded() && rows().every((row) => row.skipped)),
      /** "{n} more links after these". */
      more: computed(() => Math.max(0, store.total() - store.items().length)),
    };
  }),
  withMethods((store) => {
    const api = inject(AI_API);
    let request = 0;

    return {
      /** Reads the list; skipped links and left-out chips that are still listed stay as they were. */
      async load(): Promise<void> {
        const token = ++request;
        patchState(store, { loading: true });
        try {
          const { items, total } = await firstValueFrom(api.getTidy());
          if (token !== request) {
            return;
          }
          const links = new Set(items.map((item) => item.link.id));
          const ids = new Set(items.flatMap((item) => item.suggestions.map((s) => s.id)));
          patchState(store, {
            items,
            total,
            loaded: true,
            loading: false,
            skipped: store.skipped().filter((id) => links.has(id)),
            deselected: store.deselected().filter((id) => ids.has(id)),
          });
        } catch {
          // No AI error is shown: the page reads as empty and the way back stays.
          if (token === request) {
            patchState(store, { loaded: true, loading: false });
          }
        }
      },

      /** A chip was tapped: selected chips are applied, the others left out. */
      toggle(id: string, selected: boolean): void {
        const rest = store.deselected().filter((item) => item !== id);
        patchState(store, { deselected: selected ? rest : [...rest, id] });
      },

      skip(linkId: string): void {
        if (!store.skipped().includes(linkId)) {
          patchState(store, { skipped: [...store.skipped(), linkId] });
        }
      },

      undoSkip(linkId: string): void {
        patchState(store, { skipped: store.skipped().filter((id) => id !== linkId) });
      },

      /** The x of a left-out chip: hidden for good; it comes back when the request fails. */
      async dismiss(id: string): Promise<void> {
        const before = store.items();
        patchState(store, { items: withoutSuggestion(before, id) });
        try {
          await firstValueFrom(api.dismissSuggestion(id));
        } catch {
          patchState(store, { items: before });
        }
      },
    };
  }),
);
