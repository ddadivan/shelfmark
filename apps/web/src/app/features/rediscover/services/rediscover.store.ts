import { computed, inject, Injector } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { applyLinkChange } from '../../../stores/apply-link-change';
import { followLinkChanges } from '../../../stores/follow-link-changes';
import type { LinkChange } from '../../../stores/models/link-change.interface';
import type { LinkSlot } from '../../../stores/models/link-slot.interface';
import { REDISCOVER_API } from '../models/rediscover-api.const';
import type { RediscoverState } from '../models/rediscover-state.interface';

const initialState: RediscoverState = { block: null, loaded: false };

/**
 * This week's Rediscover block (F8: the Forgotten view of Recently opened), loaded once per session (nothing is cached on the
 * server). Dismiss and "Not interested" change the block at once; a failed request puts back only
 * what it removed (one link, or the links not hidden meanwhile), and nothing after the session end,
 * which forgets the block.
 */
export const RediscoverStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ block }) => ({
    /** The links to show; empty = no block. */
    items: computed(() => block()?.items ?? []),
    /** How many links wait (the "N forgotten" of the sidebar row and the segment). */
    count: computed(() => block()?.items.length ?? 0),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(REDISCOVER_API);
    let loading: Promise<void> | null = null;
    let epoch = 0;
    /** Links hidden in this session (pending or done): a failed dismiss never brings them back. */
    let hidden = new Set<string>();
    /** The block was dismissed (pending or done): a failed hide never brings a link back into it. */
    let dismissed = false;

    // Links a delete took out of the block, so their Undo puts them back.
    const slots = new Map<string, LinkSlot>();

    inject(SessionScope).onEnd(() => {
      slots.clear();
      epoch++;
      loading = null;
      hidden = new Set<string>();
      dismissed = false;
      patchState(store, initialState);
    });

    return {
      /** Follows `LinksStore` (the one writer): an edit, star or snooze, a delete and its Undo. */
      _follow(change: LinkChange): void {
        const block = store.block();
        if (!block) {
          return;
        }
        const items = applyLinkChange(block.items, change, slots);
        if (items !== block.items) {
          patchState(store, { block: { ...block, items: [...items] } });
        }
      },

      /** Loads the block once per session; a failure shows no block. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        const source = injector.get(REDISCOVER_API, null);
        if (!source) {
          return Promise.resolve();
        }
        const started = epoch;
        loading ??= firstValueFrom(source.getBlock())
          .then((block) => {
            if (started === epoch) {
              patchState(store, { block, loaded: true });
            }
          })
          .catch(() => {
            if (started === epoch) {
              patchState(store, { loaded: true });
            }
          });
        return loading;
      },

      /** The × of the block: gone until next week. */
      async dismiss(): Promise<void> {
        const before = store.block();
        if (!before || dismissed) {
          return;
        }
        const started = epoch;
        dismissed = true;
        patchState(store, { block: { ...before, items: [] } });
        try {
          await firstValueFrom(api().dismiss());
        } catch {
          const current = store.block();
          if (started !== epoch || !current) {
            return;
          }
          dismissed = false;
          // Back with this block's links, minus any hidden meanwhile.
          patchState(store, {
            block: { ...current, items: before.items.filter((link) => !hidden.has(link.id)) },
          });
        }
      },

      /** "Not interested": the link leaves the block for good. */
      async hide(linkId: string): Promise<void> {
        const before = store.block();
        const index = before?.items.findIndex((link) => link.id === linkId) ?? -1;
        const link = before?.items[index];
        if (!before || !link) {
          return;
        }
        const started = epoch;
        hidden.add(linkId);
        patchState(store, {
          block: { ...before, items: before.items.filter((item) => item.id !== linkId) },
        });
        try {
          await firstValueFrom(api().hide(linkId));
        } catch {
          const current = store.block();
          if (started !== epoch || !current) {
            return;
          }
          hidden.delete(linkId);
          if (dismissed || current.items.some((item) => item.id === linkId)) {
            return;
          }
          // Only this link goes back, at its place among the links still shown.
          const items = [...current.items];
          const at = before.items
            .slice(0, index)
            .filter((item) => items.some((shown) => shown.id === item.id)).length;
          items.splice(at, 0, link);
          patchState(store, { block: { ...current, items } });
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      followLinkChanges((change) => store._follow(change));
    },
  }),
);
