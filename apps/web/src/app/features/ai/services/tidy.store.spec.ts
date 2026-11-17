import { TestBed } from '@angular/core/testing';
import type { TidyItem } from '@shelfmark/contracts';
import { MOCK_LIST_FOLDERS_RESPONSE } from '@shelfmark/contracts/testing';
import { of, throwError } from 'rxjs';
import { fakeAiApi } from '../../../../testing/fake-ai-api';
import { TIDY_LINK, tidyItems } from '../../../../testing/tidy-items';
import { FoldersStore } from '../../../stores/folders.store';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { AI_API } from '../models/ai-api.const';
import { TidyStore } from './tidy.store';

const LINK = TIDY_LINK;
const TIDY_ITEMS = tidyItems();

async function setup(total = 2) {
  const api = fakeAiApi();
  api.getTidy.mockReturnValue(of({ items: TIDY_ITEMS, total }));
  TestBed.configureTestingModule({
    providers: [
      TidyStore,
      { provide: AI_API, useValue: api },
      { provide: FOLDERS_API, useValue: { list: () => of(MOCK_LIST_FOLDERS_RESPONSE) } },
    ],
  });
  await TestBed.inject(FoldersStore).load();
  const store = TestBed.inject(TidyStore);
  await store.load();
  return { api, store };
}

describe('TidyStore', () => {
  it('starts with every chip selected and sends one item per link', async () => {
    const { store } = await setup(130);
    expect(store.rows().map((row) => row.chips.map((chip) => [chip.id, chip.selected]))).toEqual([
      [
        ['f1', true],
        ['t1', true],
      ],
      [['n2', true]],
    ]);
    expect(store.applyItems()).toEqual([
      { linkId: LINK.id, suggestionIds: ['f1', 't1'] },
      { linkId: 'l2', suggestionIds: ['n2'] },
    ]);
    expect(store.applyCount()).toBe(2);
    expect(store.more()).toBe(128);
    expect(store.empty()).toBe(false);
  });

  it('leaves out a toggled chip; a link without a selected chip is not sent', async () => {
    const { store } = await setup();
    store.toggle('t1', false);
    store.toggle('n2', false);
    expect(store.rows()[0]?.chips[1]).toEqual(
      expect.objectContaining({ selected: false, labelKey: 'ai.tidy.chip.tag' }),
    );
    expect(store.applyItems()).toEqual([{ linkId: LINK.id, suggestionIds: ['f1'] }]);
    store.toggle('n2', true);
    expect(store.applyCount()).toBe(2);
  });

  it('skips and unskips links; everything skipped reads as empty', async () => {
    const { store } = await setup();
    store.skip(LINK.id);
    store.skip(LINK.id);
    expect(store.rows()[0]?.skipped).toBe(true);
    expect(store.applyItems()).toEqual([{ linkId: 'l2', suggestionIds: ['n2'] }]);
    store.skip('l2');
    expect(store.empty()).toBe(true);
    store.undoSkip('l2');
    expect(store.empty()).toBe(false);
  });

  it('keeps skips and left-out chips over a reload while they are still listed', async () => {
    const { api, store } = await setup();
    store.skip('l2');
    store.toggle('t1', false);
    api.getTidy.mockReturnValue(of({ items: [TIDY_ITEMS[0] as TidyItem], total: 1 }));
    await store.load();
    expect(store.skipped()).toEqual([]);
    expect(store.deselected()).toEqual(['t1']);
  });

  it('dismisses a chip for good and puts it back when that fails', async () => {
    const { api, store } = await setup();
    await store.dismiss('n2');
    expect(api.dismissSuggestion).toHaveBeenCalledWith('n2');
    expect(store.rows().map((row) => row.link.id)).toEqual([LINK.id]);

    api.dismissSuggestion.mockReturnValue(throwError(() => new Error('down')));
    await store.dismiss('t1');
    expect(store.rows()[0]?.chips.map((chip) => chip.id)).toEqual(['f1', 't1']);
  });

  it('reads as empty when the list fails to load', async () => {
    const api = fakeAiApi();
    api.getTidy.mockReturnValue(throwError(() => new Error('down')));
    TestBed.configureTestingModule({ providers: [TidyStore, { provide: AI_API, useValue: api }] });
    const store = TestBed.inject(TidyStore);
    await store.load();
    expect(store.loaded()).toBe(true);
    expect(store.empty()).toBe(true);
  });
});
