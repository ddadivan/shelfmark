import { TestBed } from '@angular/core/testing';
import type { CleanupApplyResponse } from '@shelfmark/contracts';
import { TOAST_DURATION_MS, TOAST_KIND, ToastService, type ToastOptions } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { fakeCleanupApi } from '../../../../testing/cleanup-report';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { CLEANUP_API } from '../models/cleanup-api.const';
import { CleanupApplyService } from './cleanup-apply.service';

const RESPONSE: CleanupApplyResponse = {
  trashed: 2,
  merged: 1,
  skipped: 0,
  trashedIds: ['hn2', 'hn3'],
  undo: { runId: '0196a1b2-0000-7000-8000-000000000001' },
};
const REQUEST = {
  duplicates: [{ groupId: 'g1', trashIds: ['hn2', 'hn3'] }],
  tagMerges: [{ pairId: 'p1', keepTagId: 't1' }],
};

async function setup() {
  const api = fakeCleanupApi();
  api.apply.mockReturnValue(of(RESPONSE));
  api.undo.mockReturnValue(of({ restored: 2, unmerged: 1 }));
  const toasts: ToastOptions[] = [];
  const links = { removeLinks: vi.fn(), refresh: vi.fn() };
  const refresh = () => ({ refresh: vi.fn(async () => undefined) });
  const counts = {
    folders: refresh(),
    tags: refresh(),
    views: refresh(),
    trash: refresh(),
    pins: refresh(),
    reminders: refresh(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: CLEANUP_API, useValue: api },
      { provide: LinksStore, useValue: links },
      { provide: FoldersStore, useValue: counts.folders },
      { provide: TagsStore, useValue: counts.tags },
      { provide: SavedViewsStore, useValue: counts.views },
      { provide: TrashStore, useValue: counts.trash },
      { provide: PinsStore, useValue: counts.pins },
      { provide: RemindersStore, useValue: counts.reminders },
      {
        provide: ToastService,
        useValue: {
          show: (toast: ToastOptions) => {
            toasts.push(toast);
            return { dismiss: () => undefined, closed: new Promise(() => undefined) };
          },
        },
      },
    ],
  });
  await loadEnglish();
  return { api, toasts, links, counts, service: TestBed.inject(CleanupApplyService) };
}

describe('CleanupApplyService', () => {
  it('applies the run, takes the copies out of the feed, refreshes the counts and offers one Undo', async () => {
    const { api, toasts, links, counts, service } = await setup();
    expect(await service.apply(REQUEST)).toBe(true);
    expect(api.apply).toHaveBeenCalledWith(REQUEST);
    expect(links.removeLinks).toHaveBeenCalledWith(['hn2', 'hn3']);
    expect(links.refresh).toHaveBeenCalled();
    for (const store of Object.values(counts)) {
      expect(store.refresh).toHaveBeenCalled();
    }
    expect(toasts[0]).toEqual(
      expect.objectContaining({
        kind: TOAST_KIND.Success,
        title: 'Cleaned up 3 things',
        detail: '2 copies in Trash, 1 tag merged',
        duration: TOAST_DURATION_MS.Undo,
      }),
    );
    expect(toasts[0]?.action?.label).toBe('Undo');
  });

  it('reverts the whole run from the toast and lets the page read its report again', async () => {
    const { api, toasts, links, service } = await setup();
    const undone = vi.fn();
    await service.apply(REQUEST, undone);
    links.refresh.mockClear();
    toasts[0]?.action?.run();
    await vi.waitFor(() => expect(undone).toHaveBeenCalled());
    expect(api.undo).toHaveBeenCalledWith(RESPONSE.undo);
    expect(links.refresh).toHaveBeenCalled();
    expect(toasts.at(-1)?.title).toBe('Clean-up undone');
  });

  it('says so when the run or its Undo fails, and names one part alone', async () => {
    const { api, toasts, links, service } = await setup();
    api.apply.mockReturnValueOnce(throwError(() => new Error('down')));
    expect(await service.apply(REQUEST)).toBe(false);
    expect(links.removeLinks).not.toHaveBeenCalled();
    expect(toasts[0]).toEqual(
      expect.objectContaining({ kind: TOAST_KIND.Danger, title: 'Couldn’t apply the changes' }),
    );

    api.apply.mockReturnValue(of({ ...RESPONSE, merged: 0 }));
    api.undo.mockReturnValue(throwError(() => new Error('down')));
    await service.apply(REQUEST);
    expect(toasts.at(-1)?.detail).toBe('2 copies in Trash');
    toasts.at(-1)?.action?.run();
    await vi.waitFor(() => expect(toasts.at(-1)?.title).toBe('Couldn’t undo the clean-up'));
  });

  it('confirms without an Undo action when the server holds no Undo', async () => {
    const { api, toasts, service } = await setup();
    api.apply.mockReturnValue(of({ ...RESPONSE, undo: null }));
    await service.apply(REQUEST);
    expect(toasts[0]).toEqual(expect.objectContaining({ title: 'Cleaned up 3 things' }));
    expect(toasts[0]?.action).toBeUndefined();
  });

  it('says there was nothing to apply when every row changed meanwhile', async () => {
    const { api, toasts, links, service } = await setup();
    api.apply.mockReturnValue(
      of({
        trashed: 0,
        merged: 0,
        skipped: 2,
        trashedIds: [],
        undo: null,
      }),
    );
    expect(await service.apply(REQUEST)).toBe(true);
    expect(links.removeLinks).not.toHaveBeenCalled();
    expect(toasts).toEqual([
      expect.objectContaining({ kind: TOAST_KIND.Info, title: 'Nothing to apply' }),
    ]);
  });
});
