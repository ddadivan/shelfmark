import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { SHARE_LIMIT } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import type { PublicCollectionState } from '../models/public-collection-state.interface';
import { SHARES_API } from '../models/shares-api.const';

const initialState: PublicCollectionState = {
  token: null,
  folder: null,
  collection: null,
  items: [],
  loading: false,
  loadingMore: false,
  notFound: false,
  failed: false,
};

function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
}

/**
 * The data of a public collection page (#276), provided by the page. `load` starts over for a
 * token (and a subfolder filter); `more` appends the next page. A response that arrives after the
 * token or the filter changed is dropped.
 */
export const PublicCollectionStore = signalStore(
  withState(initialState),
  withComputed(({ collection, items }) => ({
    hasMore: computed(() => collection()?.hasMore ?? false),
    /** The page stopped at the cap while the folder holds more links. */
    capped: computed(() => {
      const current = collection();
      return current !== null && !current.hasMore && items().length >= SHARE_LIMIT.MaxLinks;
    }),
  })),
  withMethods((store, api = inject(SHARES_API)) => {
    let generation = 0;

    async function fetch(page: number): Promise<void> {
      const token = store.token();
      if (token === null) return;
      const mine = ++generation;
      const folder = store.folder();
      try {
        const response = await firstValueFrom(
          api.collection(token, { page, ...(folder !== null && { folder }) }),
        );
        if (mine !== generation) return;
        patchState(store, {
          collection: response,
          items: page === 1 ? response.items : [...store.items(), ...response.items],
          loading: false,
          loadingMore: false,
        });
      } catch (error) {
        if (mine !== generation) return;
        patchState(store, {
          loading: false,
          loadingMore: false,
          notFound: isNotFound(error),
          failed: !isNotFound(error),
        });
      }
    }

    function load(token: string, folder: string | null = null): Promise<void> {
      // A new token forgets the old header; a new filter keeps it while the links load.
      const sameToken = token === store.token();
      patchState(store, {
        token,
        folder,
        loading: true,
        loadingMore: false,
        notFound: false,
        failed: false,
        collection: sameToken ? store.collection() : null,
        items: [],
      });
      return fetch(1);
    }

    return {
      load,

      selectFolder(folder: string | null): Promise<void> {
        const token = store.token();
        if (token === null || folder === store.folder()) return Promise.resolve();
        return load(token, folder);
      },

      more(): Promise<void> {
        const current = store.collection();
        if (!current?.hasMore || store.loading() || store.loadingMore()) {
          return Promise.resolve();
        }
        patchState(store, { loadingMore: true });
        return fetch(current.page + 1);
      },
    };
  }),
);
