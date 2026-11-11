import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  PIN_KIND,
  PIN_LIMIT,
  type FolderResponse,
  type LinkResponse,
  type PinKind,
  type PinRef,
  type PinResponse,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { isConflictError } from '../core/api/is-conflict-error';
import { SessionScope } from '../core/auth/session-scope.service';
import { PIN_OUTCOME } from '../features/pins/models/pin-outcome.const';
import type { PinOutcome } from '../features/pins/models/pin-outcome.type';
import type { PinRow } from '../features/pins/models/pin-row.interface';
import { PINS_API } from '../features/pins/models/pins-api.const';
import { pinKey } from '../features/pins/pin-key';
import { FoldersStore } from './folders.store';
import { LinksStore } from './links.store';
import type { PinsState } from './models/pins-state.interface';

const initialState: PinsState = { items: [], loaded: false, loading: false, error: false };

function toRef(pin: PinResponse): PinRef {
  const id = pin.kind === PIN_KIND.Folder ? pin.folder?.id : pin.link?.id;
  return { kind: pin.kind, id: id ?? '' };
}

function renumber(items: readonly PinResponse[]): PinResponse[] {
  return items.map((item, position) => ({ ...item, position }));
}

/**
 * The sidebar pins (`/api/pins`): at most `PIN_LIMIT.Max` folders and links in one order, cached
 * for the whole app. Pin, unpin and reorder are optimistic and roll back when the request fails;
 * the caller says what failed. `rows` shows the live folder or link behind each pin (a rename or a
 * new colour shows at once), `has` answers for menus. The session end forgets everything and
 * drops responses still in flight.
 */
export const PinsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ items }) => {
    const folders = inject(FoldersStore);
    const links = inject(LinksStore);
    return {
      count: computed(() => items().length),
      atLimit: computed(() => items().length >= PIN_LIMIT.Max),
      /** `kind:id` of every pinned item. */
      keys: computed(() => new Set(items().map((pin) => pinKey(pin.kind, toRef(pin).id)))),
      /** The pinned items in order, folders and links as they are now in the other stores. */
      rows: computed<PinRow[]>(() =>
        items().flatMap((pin): PinRow[] => {
          const { kind, id } = toRef(pin);
          if (kind === PIN_KIND.Folder) {
            const folder = folders.entityMap()[id] ?? pin.folder;
            return folder ? [{ key: pinKey(kind, id), kind, id, folder, link: null }] : [];
          }
          const link =
            links.entityMap()[id] ?? links.recent().find((item) => item.id === id) ?? pin.link;
          return link ? [{ key: pinKey(kind, id), kind, id, folder: null, link }] : [];
        }),
      ),
    };
  }),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(PINS_API);
    const folders = inject(FoldersStore);
    const links = inject(LinksStore);
    const scope = inject(SessionScope);
    let epoch = 0;
    // Bumped by every change: a list that started before it must not overwrite it.
    let version = 0;
    let firstLoad: Promise<void> | null = null;

    async function fetchList(): Promise<void> {
      const started = epoch;
      const startedVersion = version;
      if (!store.loaded()) {
        patchState(store, { loading: true, error: false });
      }
      try {
        const response = await firstValueFrom(api().list());
        if (started !== epoch) {
          return;
        }
        patchState(
          store,
          startedVersion === version
            ? { items: response.items, loaded: true, loading: false, error: false }
            : { loading: false },
        );
      } catch {
        if (started === epoch) {
          patchState(store, { loading: false, error: !store.loaded() });
        }
      }
    }

    function placeholder(ref: PinRef): PinResponse | null {
      const position = store.items().length;
      if (ref.kind === PIN_KIND.Folder) {
        const folder: FolderResponse | undefined = folders.entityMap()[ref.id];
        return folder ? { kind: ref.kind, position, folder, link: null } : null;
      }
      const link: LinkResponse | undefined =
        links.entityMap()[ref.id] ?? links.recent().find((item) => item.id === ref.id);
      return link ? { kind: ref.kind, position, folder: null, link } : null;
    }

    function isPinned(ref: PinRef): boolean {
      return store.keys().has(pinKey(ref.kind, ref.id));
    }

    scope.onEnd(() => {
      epoch++;
      version++;
      firstLoad = null;
      patchState(store, initialState);
    });

    return {
      /** Loads the pins once; a failure can be retried by calling again. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        firstLoad ??= fetchList().finally(() => (firstLoad = null));
        return firstLoad;
      },

      /** Reloads the pins from the server (after something may have unpinned items). Only once loaded. */
      refresh(): Promise<void> {
        return store.loaded() ? fetchList() : Promise.resolve();
      },

      has(kind: PinKind, id: string): boolean {
        return store.keys().has(pinKey(kind, id));
      },

      /**
       * Pins at the end at once. `limit` without a request when `PIN_LIMIT.Max` are pinned (or the
       * server says so, 409); `failed` (and the pin is taken back) on any other failure.
       */
      async pin(ref: PinRef): Promise<PinOutcome> {
        if (isPinned(ref)) {
          return PIN_OUTCOME.Done;
        }
        if (store.atLimit()) {
          return PIN_OUTCOME.Limit;
        }
        const started = epoch;
        const before = store.items();
        const optimistic = placeholder(ref);
        const mine = ++version;
        if (optimistic) {
          patchState(store, { items: [...before, optimistic] });
        }
        try {
          const response = await firstValueFrom(api().create(ref));
          if (started === epoch && version === mine) {
            version++;
            patchState(store, { items: response.items, loaded: true });
          }
          return PIN_OUTCOME.Done;
        } catch (error) {
          if (started === epoch) {
            version++;
            patchState(store, {
              items: store.items().filter((pin) => !samePin(pin, ref)),
            });
            if (isConflictError(error)) {
              void fetchList();
            }
          }
          return isConflictError(error) ? PIN_OUTCOME.Limit : PIN_OUTCOME.Failed;
        }
      },

      /** Unpins at once; resolves false (and pins it back in place) when the request fails. */
      async unpin(ref: PinRef): Promise<boolean> {
        const before = store.items();
        if (!isPinned(ref)) {
          return true;
        }
        const started = epoch;
        version++;
        patchState(store, { items: renumber(before.filter((pin) => !samePin(pin, ref))) });
        try {
          await firstValueFrom(api().remove(ref));
          return true;
        } catch {
          if (started === epoch) {
            version++;
            if (!isPinned(ref)) {
              patchState(store, { items: before });
            }
          }
          return false;
        }
      },

      /** Moves an item to `toIndex` at once; resolves false (and puts the order back) when the request fails. */
      async move(ref: PinRef, toIndex: number): Promise<boolean> {
        const before = store.items();
        const from = before.findIndex((pin) => samePin(pin, ref));
        const to = Math.max(0, Math.min(toIndex, before.length - 1));
        if (from < 0 || from === to) {
          return true;
        }
        const next = [...before];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        const started = epoch;
        const mine = ++version;
        patchState(store, { items: renumber(next) });
        try {
          const response = await firstValueFrom(api().reorder(next.map(toRef)));
          // Another change since (an unpin, a pin) already shows the newer state: keep it.
          if (started === epoch && version === mine) {
            version++;
            patchState(store, { items: response.items });
          }
          return true;
        } catch {
          if (started === epoch) {
            if (version === mine) {
              version++;
              patchState(store, { items: before });
            } else {
              // Later changes sit on top of this one: do not undo them, ask the server instead.
              void fetchList();
            }
          }
          return false;
        }
      },

      /** Folders that went to Trash are no longer pinned. */
      dropFolders(ids: readonly string[]): void {
        version++;
        patchState(store, {
          items: renumber(
            store
              .items()
              .filter((pin) => pin.kind !== PIN_KIND.Folder || !ids.includes(toRef(pin).id)),
          ),
        });
      },

      /** A link that went to Trash is no longer pinned. */
      dropLink(id: string): void {
        version++;
        patchState(store, {
          items: renumber(
            store.items().filter((pin) => pin.kind !== PIN_KIND.Link || toRef(pin).id !== id),
          ),
        });
      },
    };
  }),
);

function samePin(pin: PinResponse, ref: PinRef): boolean {
  const own = toRef(pin);
  return own.kind === ref.kind && own.id === ref.id;
}
