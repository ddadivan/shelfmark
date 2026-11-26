import { TestBed } from '@angular/core/testing';
import { REDISCOVER_MODE, type LinkResponse, type RediscoverResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { REDISCOVER_API } from '../models/rediscover-api.const';
import type { RediscoverApi } from '../models/rediscover-api.interface';
import { LinksStore } from '../../../stores/links.store';
import { RediscoverStore } from './rediscover.store';

const links = ['a', 'b', 'c'].map((id) => ({ id }) as LinkResponse);
const BLOCK: RediscoverResponse = {
  week: '2026-W47',
  mode: REDISCOVER_MODE.Forgotten,
  theme: null,
  items: links,
};

function setup(api: Partial<{ [K in keyof RediscoverApi]: ReturnType<typeof vi.fn> }> = {}) {
  const full = {
    getBlock: vi.fn(() => of(BLOCK)),
    dismiss: vi.fn(() => of(undefined)),
    hide: vi.fn(() => of(undefined)),
    ...api,
  };
  TestBed.configureTestingModule({ providers: [{ provide: REDISCOVER_API, useValue: full }] });
  return { api: full, store: TestBed.inject(RediscoverStore) };
}

describe('RediscoverStore', () => {
  it('loads once and hides a link or the whole block', async () => {
    const { api, store } = setup();
    await store.load();
    await store.load();
    expect(api.getBlock).toHaveBeenCalledTimes(1);
    expect(store.items()).toHaveLength(3);
    expect(store.count()).toBe(3);
    expect(store.loaded()).toBe(true);
    await store.hide('b');
    expect(api.hide).toHaveBeenCalledWith('b');
    expect(store.items().map((l) => l.id)).toEqual(['a', 'c']);
    await store.dismiss();
    expect(store.items()).toEqual([]);
  });

  it('puts the block back when a change fails, and shows nothing when loading fails', async () => {
    const failing = () => throwError(() => new Error('down'));
    const { store } = setup({ hide: vi.fn(failing), dismiss: vi.fn(failing) });
    await store.load();
    await store.hide('a');
    expect(store.items()).toHaveLength(3);
    await store.dismiss();
    expect(store.items()).toHaveLength(3);
    TestBed.resetTestingModule();
    const broken = setup({ getBlock: vi.fn(failing) });
    expect(broken.store.loaded()).toBe(false);
    await broken.store.load();
    expect(broken.store.items()).toEqual([]);
    expect(broken.store.loaded()).toBe(true);
  });

  it('puts back only the link whose hide failed, keeping a later hide', async () => {
    const failA = new Subject<undefined>();
    const { store } = setup({
      hide: vi.fn((id: string) => (id === 'a' ? failA : of(undefined))),
    });
    await store.load();
    const pending = store.hide('a');
    await store.hide('c');
    expect(store.items().map((l) => l.id)).toEqual(['b']);
    failA.error(new Error('down'));
    await pending;
    expect(store.items().map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('keeps a link hidden meanwhile out when a dismiss fails', async () => {
    const failDismiss = new Subject<undefined>();
    const { store } = setup({ dismiss: vi.fn(() => failDismiss) });
    await store.load();
    await store.hide('b');
    const pending = store.dismiss();
    expect(store.items()).toEqual([]);
    failDismiss.error(new Error('down'));
    await pending;
    expect(store.items().map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('restores nothing after the session ended', async () => {
    const failHide = new Subject<undefined>();
    const { store } = setup({ hide: vi.fn(() => failHide) });
    await store.load();
    const pending = store.hide('a');
    TestBed.inject(SessionScope).end();
    failHide.error(new Error('down'));
    await pending;
    expect(store.block()).toBeNull();
  });

  it('does nothing without an API (specs of pages that do not provide it)', async () => {
    const store = TestBed.inject(RediscoverStore);
    await store.load();
    await store.hide('a');
    await store.dismiss();
    expect(store.items()).toEqual([]);
  });

  it('follows the links store: an edit, a delete and its Undo', async () => {
    const { store } = setup();
    await store.load();
    const linksStore = TestBed.inject(LinksStore);
    linksStore.applyEdit({ ...(MOCK_LINKS[0] as LinkResponse), id: 'b', title: 'Renamed' });
    expect(store.items().map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(store.items()[1]?.title).toBe('Renamed');
    linksStore.remove('b', store.items()[1]);
    expect(store.items().map((l) => l.id)).toEqual(['a', 'c']);
    linksStore.undoRemove('b');
    expect(store.items().map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });
});
