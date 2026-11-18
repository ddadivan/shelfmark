import { TestBed } from '@angular/core/testing';
import { REDISCOVER_MODE, type LinkResponse, type RediscoverResponse } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { REDISCOVER_API } from '../models/rediscover-api.const';
import type { RediscoverApi } from '../models/rediscover-api.interface';
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
    await broken.store.load();
    expect(broken.store.items()).toEqual([]);
  });

  it('does nothing without an API (specs of pages that do not provide it)', async () => {
    const store = TestBed.inject(RediscoverStore);
    await store.load();
    await store.hide('a');
    await store.dismiss();
    expect(store.items()).toEqual([]);
  });
});
