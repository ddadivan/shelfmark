import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { REDISCOVER_API } from '../models/rediscover-api.const';
import type { RediscoverState } from '../models/rediscover-state.interface';

const initialState: RediscoverState = { block: null };

/**
 * This week's "From your shelf" block (F8), loaded once per session (nothing is cached on the
 * server). Dismiss and "Not interested" change the block at once and put it back when the request
 * fails. The session end forgets it.
 */
export const RediscoverStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ block }) => ({
    /** The links to show; empty = no block. */
    items: computed(() => block()?.items ?? []),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(REDISCOVER_API);
    let loading: Promise<void> | null = null;
    let epoch = 0;

    inject(SessionScope).onEnd(() => {
      epoch++;
      loading = null;
      patchState(store, initialState);
    });

    return {
      /** Loads the block once per session; a failure shows no block. */
      load(): Promise<void> {
        if (store.block() !== null) {
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
              patchState(store, { block });
            }
          })
          .catch(() => undefined);
        return loading;
      },

      /** The × of the block: gone until next week. */
      async dismiss(): Promise<void> {
        const before = store.block();
        if (!before) {
          return;
        }
        patchState(store, { block: { ...before, items: [] } });
        try {
          await firstValueFrom(api().dismiss());
        } catch {
          patchState(store, { block: before });
        }
      },

      /** "Not interested": the link leaves the block for good. */
      async hide(linkId: string): Promise<void> {
        const before = store.block();
        if (!before) {
          return;
        }
        patchState(store, {
          block: { ...before, items: before.items.filter((link) => link.id !== linkId) },
        });
        try {
          await firstValueFrom(api().hide(linkId));
        } catch {
          patchState(store, { block: before });
        }
      },
    };
  }),
);
