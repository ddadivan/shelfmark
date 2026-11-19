import { computed, DestroyRef, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { TidyApplyItem, TidyItem } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { AI_API } from '../models/ai-api.const';
import type { TidyRowView } from '../models/tidy-row-view.interface';
import type { TidyState } from '../models/tidy-state.interface';
import { tidyChips } from '../utils/tidy-chips';
import { TidyApplyService } from './tidy-apply.service';

const initialState: TidyState = {
  items: [],
  total: 0,
  after: null,
  importId: null,
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
 * `items` with the suggestion `id` of `before` back in its place (its link too, when the link had
 * left the list with it); everything else stays as it is now.
 */
function withSuggestion(
  items: readonly TidyItem[],
  before: readonly TidyItem[],
  id: string,
): TidyItem[] {
  const origin = before.findIndex((item) => item.suggestions.some((s) => s.id === id));
  const item = before[origin];
  const suggestion = item?.suggestions.find((s) => s.id === id);
  if (item === undefined || suggestion === undefined) {
    return [...items];
  }
  const at = items.findIndex((entry) => entry.link.id === item.link.id);
  if (at === -1) {
    const next = [...items];
    next.splice(Math.min(origin, next.length), 0, { ...item, suggestions: [suggestion] });
    return next;
  }
  return items.map((entry, index) => {
    if (index !== at || entry.suggestions.some((s) => s.id === id)) {
      return entry;
    }
    const place = item.suggestions.indexOf(suggestion);
    const suggestions = [...entry.suggestions];
    suggestions.splice(Math.min(place, suggestions.length), 0, suggestion);
    return { ...entry, suggestions };
  });
}

/**
 * The Tidy review page (AI-2, provided by the page): the links in Unsorted (or, with `importId`,
 * the links of one import in any folder) with their suggestions,
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
    const more = computed(() => Math.max(0, store.total() - store.items().length));
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
      /** "{n} more links after these". */
      more,
      /** "Nothing to tidy": nothing listed, or every link skipped and no page after this one. */
      empty: computed(
        () =>
          store.loaded() &&
          (store.items().length === 0 || (more() === 0 && rows().every((row) => row.skipped))),
      ),
      /** Nothing on this page is applied but more links follow: "Show the next links". */
      canNext: computed(() => store.loaded() && more() > 0 && applyItems().length === 0),
    };
  }),
  withMethods((store) => {
    const api = inject(AI_API);
    const applier = inject(TidyApplyService);
    let request = 0;
    // The page left: a late Undo no longer reads its list.
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));

    /**
     * Reads the page (after `store.after()`); skipped links and left-out chips that are still listed
     * stay as they were.
     */
    async function load(): Promise<void> {
      const token = ++request;
      patchState(store, { loading: true });
      try {
        const after = store.after() ?? undefined;
        const importId = store.importId();
        const { items, total } = await firstValueFrom(
          importId === null ? api.getTidy(after) : api.getTidy(after, importId),
        );
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
    }

    /** The page after the last link listed now: skipped and left-as-is links no longer hold it. */
    function nextPage(): void {
      const last = store.items().at(-1)?.link.id;
      if (last !== undefined) {
        patchState(store, { after: last, skipped: [], deselected: [] });
      }
    }

    return {
      load,

      /**
       * Limits the review to the links of one import, or back to Unsorted (`null`), and reads it
       * from the first page; a no-op while the choice stays the same and the list was read.
       */
      async setImport(importId: string | null): Promise<void> {
        if (importId === store.importId() && store.loaded()) {
          return;
        }
        patchState(store, {
          importId,
          after: null,
          items: [],
          total: 0,
          loaded: false,
          skipped: [],
          deselected: [],
        });
        await load();
      },

      /**
       * "Apply to {n} links": one run of what is selected; the list is read again afterwards (the
       * next page when more remain, so skipped links do not hold it) and, from the first page,
       * after the toast's Undo.
       */
      async apply(): Promise<void> {
        const items = store.applyItems();
        if (store.applying() || items.length === 0) {
          return;
        }
        const hadMore = store.more() > 0;
        patchState(store, { applying: true });
        const undone = () => {
          if (!destroyed) {
            patchState(store, { after: null });
            void load();
          }
        };
        const done = await applier.apply(items, undone);
        patchState(store, { applying: false });
        if (done && !destroyed) {
          if (hadMore) {
            nextPage();
          }
          void load();
        }
      },

      /** "Show the next links": every link here is skipped or left out, and more follow. */
      async next(): Promise<void> {
        if (!store.canNext()) {
          return;
        }
        nextPage();
        await load();
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

      /**
       * The x of a left-out chip: hidden for good. When the request fails only that chip comes
       * back; when the list was read again meanwhile, it is read once more instead.
       */
      async dismiss(id: string): Promise<void> {
        const before = store.items();
        const token = request;
        patchState(store, { items: withoutSuggestion(before, id) });
        try {
          await firstValueFrom(api.dismissSuggestion(id));
        } catch {
          if (destroyed) {
            return;
          }
          if (token === request) {
            patchState(store, { items: withSuggestion(store.items(), before, id) });
          } else {
            void load();
          }
        }
      },
    };
  }),
);
