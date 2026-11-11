import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  PIN_KIND,
  PIN_LIMIT,
  type FolderResponse,
  type ListPinsResponse,
  type PinRef,
  type PinResponse,
} from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../core/auth/session-scope.service';
import { FOLDERS_API } from '../features/links/models/folders-api.const';
import { LINKS_API } from '../features/links/models/links-api.const';
import { PIN_OUTCOME } from '../features/pins/models/pin-outcome.const';
import { PINS_API } from '../features/pins/models/pins-api.const';
import type { PinsApi } from '../features/pins/models/pins-api.interface';
import { FoldersStore } from './folders.store';
import { PinsStore } from './pins.store';

function folder(id: string): FolderResponse {
  return { ...MOCK_FOLDERS[0], id, name: id, pinned: true };
}

function pin(id: string, position: number): PinResponse {
  return { kind: PIN_KIND.Folder, position, folder: folder(id), link: null };
}

function list(...ids: string[]): ListPinsResponse {
  return { items: ids.map(pin) };
}

const ref = (id: string): PinRef => ({ kind: PIN_KIND.Folder, id });

function setup(initial: ListPinsResponse = list('a', 'b')) {
  const api = {
    list: vi.fn<PinsApi['list']>(() => of(initial)),
    create: vi.fn<PinsApi['create']>((request) =>
      of({ items: [...initial.items, pin(request.id, initial.items.length)] }),
    ),
    remove: vi.fn<PinsApi['remove']>(() => of(undefined)),
    reorder: vi.fn<PinsApi['reorder']>((refs) => of(list(...refs.map((item) => item.id)))),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: PINS_API, useValue: api },
      {
        provide: FOLDERS_API,
        useValue: {
          list: () => of({ items: [folder('a'), folder('b'), folder('c')], counts: {} }),
          update: (id: string) => of({ ...folder(id), updatedAt: 'later' }),
        },
      },
      { provide: LINKS_API, useValue: {} },
    ],
  });
  return { api, store: TestBed.inject(PinsStore) };
}

describe('PinsStore', () => {
  it('loads the pins once and answers has() and rows', async () => {
    const { store, api } = setup();

    await Promise.all([store.load(), store.load()]);

    expect(api.list).toHaveBeenCalledTimes(1);
    expect(store.count()).toBe(2);
    expect(store.has(PIN_KIND.Folder, 'a')).toBe(true);
    expect(store.has(PIN_KIND.Link, 'a')).toBe(false);
    expect(store.rows().map((row) => row.id)).toEqual(['a', 'b']);
  });

  it('shows the live folder behind a pin (a rename shows at once)', async () => {
    const { store } = setup();
    await store.load();
    await TestBed.inject(FoldersStore).load();

    await TestBed.inject(FoldersStore).rename('a', 'Renamed');

    expect(store.rows()[0].folder?.name).toBe('Renamed');
  });

  it('flags a failed first load', async () => {
    const { store, api } = setup();
    api.list.mockImplementation(() => throwError(() => new Error('down')));

    await store.load();

    expect(store.error()).toBe(true);
  });

  describe('pin', () => {
    it('adds at the end and takes the server order', async () => {
      const { store, api } = setup();
      await store.load();
      await TestBed.inject(FoldersStore).load();

      const outcome = await store.pin(ref('c'));

      expect(outcome).toBe(PIN_OUTCOME.Done);
      expect(api.create).toHaveBeenCalledWith(ref('c'));
      expect(store.rows().map((row) => row.id)).toEqual(['a', 'b', 'c']);
    });

    it('is idempotent for a pinned item', async () => {
      const { store, api } = setup();
      await store.load();

      expect(await store.pin(ref('a'))).toBe(PIN_OUTCOME.Done);

      expect(api.create).not.toHaveBeenCalled();
    });

    it('shows the pin at once and takes it back when the request fails', async () => {
      const { store, api } = setup();
      await store.load();
      await TestBed.inject(FoldersStore).load();
      const pending = new Subject<ListPinsResponse>();
      api.create.mockImplementation(() => pending);

      const result = store.pin(ref('c'));
      expect(store.has(PIN_KIND.Folder, 'c')).toBe(true);
      pending.error(new Error('down'));

      expect(await result).toBe(PIN_OUTCOME.Failed);
      expect(store.has(PIN_KIND.Folder, 'c')).toBe(false);
      expect(store.count()).toBe(2);
    });

    it('refuses the item beyond the limit without a request', async () => {
      const ids = Array.from({ length: PIN_LIMIT.Max }, (_, index) => `f${index}`);
      const { store, api } = setup(list(...ids));
      await store.load();

      expect(store.atLimit()).toBe(true);
      expect(await store.pin(ref('extra'))).toBe(PIN_OUTCOME.Limit);

      expect(api.create).not.toHaveBeenCalled();
    });

    it('reports the limit when the server answers 409 and reloads', async () => {
      const { store, api } = setup();
      await store.load();
      api.create.mockImplementation(() =>
        throwError(
          () => new HttpErrorResponse({ status: HttpStatusCode.Conflict, statusText: 'Conflict' }),
        ),
      );

      expect(await store.pin(ref('c'))).toBe(PIN_OUTCOME.Limit);

      expect(store.has(PIN_KIND.Folder, 'c')).toBe(false);
      expect(api.list).toHaveBeenCalledTimes(2);
    });
  });

  describe('unpin', () => {
    it('removes at once and sends the request', async () => {
      const { store, api } = setup();
      await store.load();

      expect(await store.unpin(ref('a'))).toBe(true);

      expect(api.remove).toHaveBeenCalledWith(ref('a'));
      expect(store.rows().map((row) => row.id)).toEqual(['b']);
    });

    it('puts the pin back in place when the request fails', async () => {
      const { store, api } = setup();
      await store.load();
      api.remove.mockImplementation(() => throwError(() => new Error('down')));

      expect(await store.unpin(ref('a'))).toBe(false);

      expect(store.rows().map((row) => row.id)).toEqual(['a', 'b']);
    });
  });

  describe('move', () => {
    it('reorders at once and sends the whole order', async () => {
      const { store, api } = setup(list('a', 'b', 'c'));
      await store.load();

      expect(await store.move(ref('c'), 0)).toBe(true);

      expect(api.reorder).toHaveBeenCalledWith([ref('c'), ref('a'), ref('b')]);
      expect(store.items().map((item) => item.position)).toEqual([0, 1, 2]);
    });

    it('does nothing for the same place or an unknown item', async () => {
      const { store, api } = setup();
      await store.load();

      await store.move(ref('a'), 0);
      await store.move(ref('zzz'), 1);

      expect(api.reorder).not.toHaveBeenCalled();
    });

    it('keeps a newer unpin when the slower reorder answers with the old list', async () => {
      const { store, api } = setup(list('a', 'b'));
      await store.load();
      const reorder = new Subject<ListPinsResponse>();
      api.reorder.mockImplementation(() => reorder);

      const moving = store.move(ref('a'), 1);
      await store.unpin(ref('b'));
      reorder.next(list('b', 'a'));
      reorder.complete();
      await moving;

      expect(store.rows().map((row) => row.id)).toEqual(['a']);
    });

    it('does not bring an unpinned item back when the reorder fails', async () => {
      const { store, api } = setup(list('a', 'b'));
      await store.load();
      const reorder = new Subject<ListPinsResponse>();
      api.reorder.mockImplementation(() => reorder);

      const moving = store.move(ref('a'), 1);
      await store.unpin(ref('b'));
      // The server has the unpin: the resync after the failed reorder shows it.
      api.list.mockImplementation(() => of(list('a')));
      reorder.error(new Error('400'));
      await moving;

      await vi.waitFor(() => expect(store.rows().map((row) => row.id)).toEqual(['a']));
    });

    it('puts the old order back when the request fails', async () => {
      const { store, api } = setup();
      await store.load();
      api.reorder.mockImplementation(() => throwError(() => new Error('down')));

      expect(await store.move(ref('b'), 0)).toBe(false);

      expect(store.rows().map((row) => row.id)).toEqual(['a', 'b']);
    });
  });

  it('drops the pins of folders and links that went to Trash', async () => {
    const { store } = setup(list('a', 'b', 'c'));
    await store.load();

    store.dropFolders(['a', 'c']);
    store.dropLink(MOCK_LINKS[0].id);

    expect(store.rows().map((row) => row.id)).toEqual(['b']);
    expect(store.items()[0].position).toBe(0);
  });

  it('forgets everything when the session ends', async () => {
    const { store } = setup();
    await store.load();

    TestBed.inject(SessionScope).end();

    expect(store.count()).toBe(0);
    expect(store.loaded()).toBe(false);
  });
});
