import { computed, DestroyRef, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntities,
  removeAllEntities,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import type { LinkResponse } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { placeLinks, takesNewcomers } from '../../../stores/links-feed';
import type { LinkChange } from '../../../stores/models/link-change.interface';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksFilter } from '../../links/models/links-filter.type';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { linksQuery } from '../../links/utils/links-filter';
import type { SplitFeedState } from '../models/split-feed-state.interface';
import type { SplitTarget } from '../models/split-target.type';
import { SplitViewService } from './split-view.service';

const initialState: SplitFeedState = {
  target: undefined,
  nextCursor: null,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: false,
  loadMoreFailed: false,
};

/** The feed of a target in its default order: a folder or Unsorted, no filters. */
function filterOf(target: string | null): LinksFilter {
  return target === null
    ? { scope: LINKS_SCOPE.Unsorted }
    : { scope: LINKS_SCOPE.Folder, folderId: target };
}

/**
 * The feed of the right half of the side-by-side view (#386, ADR 0044): page one and "load more"
 * of a folder or Unsorted in the default order, read only. `LinksStore` stays the only writer;
 * its `linkChanges` keep this feed in step (`placeLink`, with a slot map of its own, so Undo puts a
 * link back where it was). Links in their delete Undo window are left out. Page-scoped, it follows
 * `SplitViewService.rightTarget` and loads again when the target changes or on a `reload` change.
 */
export const SplitFeedStore = signalStore(
  withEntities<LinkResponse>(),
  withState(initialState),
  withComputed(({ entities, nextCursor }) => ({
    count: computed(() => entities().length),
    hasMore: computed(() => nextCursor() !== null),
  })),
  withMethods((store) => {
    const api = inject(LINKS_API);
    const links = inject(LinksStore);
    const folders = inject(FoldersStore);
    // Changes that came while page one was on its way: replayed once it has arrived.
    let buffer: LinkChange[] = [];
    let reloadAfter = false;
    // Feed slots of links that left the target, so a link that comes back (Undo) gets its slot.
    const slots = new Map<string, number>();
    // Bumped by every target change and reload: late responses are dropped.
    let generation = 0;

    /** Applies what came while page one was loading (a coarse change loads page one once more). */
    function replay(target: string | null): void {
      const pending = buffer;
      const again = reloadAfter;
      buffer = [];
      reloadAfter = false;
      if (again) {
        show(target);
        return;
      }
      pending.forEach((change) => apply(change));
    }

    async function loadFirst(target: string | null, started: number): Promise<void> {
      try {
        const page = await firstValueFrom(api.list(linksQuery(filterOf(target))));
        if (started === generation) {
          patchState(
            store,
            // The pinned links of a folder come first; the rest follow in the sort order.
            setAllEntities(
              [...page.pinned, ...page.items].filter((link) => !links.isPending(link.id)),
            ),
            { nextCursor: page.nextCursor, loaded: true, loading: false },
          );
          replay(target);
        }
      } catch {
        if (started === generation) {
          patchState(store, { loading: false, error: true });
        }
      }
    }

    /** Shows the feed of `target` (`undefined`: none). The same target loads page one again, keeping what shows. */
    function show(target: SplitTarget): void {
      generation++;
      slots.clear();
      buffer = [];
      reloadAfter = false;
      if (target === undefined) {
        patchState(store, initialState, removeAllEntities());
        return;
      }
      const changed = target !== store.target();
      patchState(
        store,
        { target, loading: true, loadingMore: false, error: false, loadMoreFailed: false },
        changed ? removeAllEntities() : {},
        changed ? { loaded: false, nextCursor: null } : {},
      );
      void loadFirst(target, generation);
    }

    function apply(change: LinkChange): void {
      const target = store.target();
      if (target === undefined) {
        return;
      }
      if (change.reload) {
        // A deleted folder is not asked for: the target effect moves the half to the picker.
        if (target !== null && folders.loaded() && !folders.entityMap()[target]) {
          return;
        }
        if (store.loading() && !store.loaded()) {
          reloadAfter = true;
        } else {
          show(target);
        }
        return;
      }
      if (!store.loaded()) {
        // Page one is on its way and may not hold this change: keep it for when it arrives.
        if (store.loading()) {
          buffer.push(change);
        }
        return;
      }
      const filter = filterOf(target);
      const original = store.entities();
      for (const id of change.removed ?? []) {
        // The slot is the place in the feed as it was, and is kept: Undo of a delete brings the
        // link back to it.
        const at = original.findIndex((link) => link.id === id);
        if (at >= 0) {
          slots.set(id, at);
        }
      }
      const gone = new Set(change.removed ?? []);
      const kept = original.filter((link) => !gone.has(link.id));
      const entities = placeLinks(
        kept,
        filter,
        change.upserted ?? [],
        slots,
        change.moved === true && takesNewcomers(filter, store.hasMore()),
      );
      patchState(store, setAllEntities([...entities]));
    }

    return {
      show,

      /** Loads the next page; does nothing while a request runs or on the last page. */
      async loadMore(): Promise<void> {
        const target = store.target();
        const cursor = store.nextCursor();
        if (target === undefined || cursor === null || store.loading() || store.loadingMore()) {
          return;
        }
        const started = generation;
        patchState(store, { loadingMore: true, loadMoreFailed: false });
        try {
          const page = await firstValueFrom(api.list(linksQuery(filterOf(target), cursor)));
          if (started === generation) {
            patchState(store, addEntities(page.items.filter((link) => !links.isPending(link.id))), {
              nextCursor: page.nextCursor,
              loadingMore: false,
            });
          }
        } catch {
          if (started === generation) {
            patchState(store, { loadingMore: false, loadMoreFailed: true });
          }
        }
      },

      /** Applies what `LinksStore` changed: a link in its new state, gone ids, or a reload. */
      apply,
    };
  }),
  withHooks({
    onInit(store) {
      const view = inject(SplitViewService);
      const links = inject(LinksStore);
      links.linkChanges
        .pipe(takeUntilDestroyed(inject(DestroyRef)))
        .subscribe((change) => store.apply(change));
      effect(() => {
        const target = view.rightTarget();
        untracked(() => store.show(target));
      });
    },
  }),
);
