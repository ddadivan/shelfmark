import { TestBed } from '@angular/core/testing';
import type { TidyItem } from '@shelfmark/contracts';
import { MOCK_LIST_FOLDERS_RESPONSE } from '@shelfmark/contracts/testing';
import { of, Subject, throwError } from 'rxjs';
import { fakeAiApi } from '../../../../testing/fake-ai-api';
import { TIDY_LINK, tidyItems } from '../../../../testing/tidy-items';
import { FoldersStore } from '../../../stores/folders.store';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import { AI_API } from '../models/ai-api.const';
import { TidyApplyService } from './tidy-apply.service';
import { TidyStore } from './tidy.store';

const LINK = TIDY_LINK;
const TIDY_ITEMS = tidyItems();

async function setup(total = 2) {
  const api = fakeAiApi();
  const applier = { apply: vi.fn<TidyApplyService['apply']>(async () => true) };
  api.getTidy.mockReturnValue(of({ items: TIDY_ITEMS, total }));
  TestBed.configureTestingModule({
    providers: [
      TidyStore,
      { provide: AI_API, useValue: api },
      { provide: FOLDERS_API, useValue: { list: () => of(MOCK_LIST_FOLDERS_RESPONSE) } },
      { provide: TidyApplyService, useValue: applier },
    ],
  });
  await TestBed.inject(FoldersStore).load();
  const store = TestBed.inject(TidyStore);
  await store.load();
  return { api, applier, store };
}

describe('TidyStore', () => {
  it('limits the review to one import, from the first page, and back to Unsorted', async () => {
    const { api, store } = await setup();
    api.getTidy.mockClear();

    await store.setImport('imp1');
    expect(api.getTidy).toHaveBeenLastCalledWith(undefined, 'imp1');
    expect(store.importId()).toBe('imp1');

    // The same choice on a read list does not read again.
    await store.setImport('imp1');
    expect(api.getTidy).toHaveBeenCalledTimes(1);

    await store.setImport(null);
    expect(api.getTidy).toHaveBeenLastCalledWith(undefined);
    expect(store.importId()).toBeNull();
  });

  it('forgets skipped links and left-out chips when the import changes', async () => {
    const { store } = await setup();
    store.skip(LINK.id);
    store.toggle('t1', false);

    await store.setImport('imp1');

    expect(store.rows().every((row) => !row.skipped)).toBe(true);
    expect(store.rows()[0]?.chips.every((chip) => chip.selected)).toBe(true);
  });

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

  it('puts back only the failed chip over newer changes, and reads again after a reload', async () => {
    const { api, store } = await setup();
    const failing = new Subject<void>();
    api.dismissSuggestion.mockReturnValueOnce(failing.asObservable());
    const pending = store.dismiss('t1');
    await store.dismiss('n2');
    failing.error(new Error('down'));
    await pending;
    expect(store.rows().map((row) => row.chips.map((chip) => chip.id))).toEqual([['f1', 't1']]);

    const late = new Subject<void>();
    api.dismissSuggestion.mockReturnValueOnce(late.asObservable());
    const after = store.dismiss('f1');
    await store.load();
    api.getTidy.mockClear();
    late.error(new Error('down'));
    await after;
    expect(api.getTidy).toHaveBeenCalledTimes(1);
  });

  it('with more links after these, all skipped is not empty: the next page reads after the last', async () => {
    const { api, store } = await setup(130);
    store.skip(LINK.id);
    store.skip('l2');
    expect(store.empty()).toBe(false);
    expect(store.canNext()).toBe(true);
    api.getTidy.mockClear();
    await store.next();
    expect(api.getTidy).toHaveBeenCalledWith('l2');
    expect(store.after()).toBe('l2');
    expect(store.skipped()).toEqual([]);
  });

  it('reads the next page after an apply when more remain, and the first page after Undo', async () => {
    const { api, applier, store } = await setup(130);
    store.skip('l2');
    expect(store.canNext()).toBe(false);
    api.getTidy.mockClear();
    await store.apply();
    expect(api.getTidy).toHaveBeenLastCalledWith('l2');
    applier.apply.mock.calls[0]?.[1]?.();
    expect(api.getTidy).toHaveBeenLastCalledWith(undefined);
    expect(store.after()).toBeNull();
  });

  it('reads as empty when the list fails to load', async () => {
    const api = fakeAiApi();
    api.getTidy.mockReturnValue(throwError(() => new Error('down')));
    TestBed.configureTestingModule({
      providers: [
        TidyStore,
        { provide: AI_API, useValue: api },
        { provide: TidyApplyService, useValue: {} },
      ],
    });
    const store = TestBed.inject(TidyStore);
    await store.load();
    expect(store.loaded()).toBe(true);
    expect(store.empty()).toBe(true);
  });

  it('applies what is selected in one run and reads the list again, also after Undo', async () => {
    const { api, applier, store } = await setup();
    store.toggle('t1', false);
    api.getTidy.mockClear();
    await store.apply();
    expect(applier.apply).toHaveBeenCalledWith(
      [
        { linkId: LINK.id, suggestionIds: ['f1'] },
        { linkId: 'l2', suggestionIds: ['n2'] },
      ],
      expect.any(Function),
    );
    expect(store.applying()).toBe(false);
    expect(api.getTidy).toHaveBeenCalledTimes(1);
    applier.apply.mock.calls[0]?.[1]?.();
    expect(api.getTidy).toHaveBeenCalledTimes(2);

    applier.apply.mockResolvedValueOnce(false);
    await store.apply();
    expect(api.getTidy).toHaveBeenCalledTimes(2);
  });
});
