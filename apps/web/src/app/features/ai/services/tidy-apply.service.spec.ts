import { TestBed } from '@angular/core/testing';
import type { TidyApplyResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS } from '@shelfmark/contracts/testing';
import { TOAST_DURATION_MS, TOAST_KIND, ToastService, type ToastOptions } from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { fakeAiApi } from '../../../../testing/fake-ai-api';
import { TIDY_LINK } from '../../../../testing/tidy-items';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { AI_API } from '../models/ai-api.const';
import { TidyApplyService } from './tidy-apply.service';
import { TidyCountStore } from './tidy-count.store';

const FOLDER = MOCK_FOLDERS[0];
const MOVED = { ...TIDY_LINK, folderId: FOLDER?.id ?? null, tags: ['docs', 'recipes'] };
const RESPONSE: TidyApplyResponse = {
  links: [MOVED],
  applied: 1,
  folders: 1,
  tagsAdded: 3,
  skipped: 0,
  undo: {
    items: [
      { linkId: TIDY_LINK.id, folderId: MOVED.folderId, tags: ['docs'], suggestionIds: ['f1'] },
    ],
  },
};
const ITEMS = [{ linkId: TIDY_LINK.id, suggestionIds: ['f1', 't1'] }];

async function setup() {
  const api = fakeAiApi();
  api.applyTidy.mockReturnValue(of(RESPONSE));
  api.undoTidy.mockReturnValue(of({ links: [TIDY_LINK] }));
  const toasts: ToastOptions[] = [];
  const links = { patchLinks: vi.fn(), refresh: vi.fn() };
  const counts = {
    folders: {
      refresh: vi.fn(async () => undefined),
      entityMap: () => ({ [FOLDER?.id ?? '']: FOLDER }),
    },
    tags: { noteLinkSaved: vi.fn(async () => undefined) },
    views: { refresh: vi.fn(async () => undefined) },
    tidy: { load: vi.fn(async () => undefined) },
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: AI_API, useValue: api },
      { provide: LinksStore, useValue: links },
      { provide: FoldersStore, useValue: counts.folders },
      { provide: TagsStore, useValue: counts.tags },
      { provide: SavedViewsStore, useValue: counts.views },
      { provide: TidyCountStore, useValue: counts.tidy },
      { provide: UserSettingsStore, useValue: { shownColour: (colour: string) => colour } },
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
  return { api, toasts, links, counts, service: TestBed.inject(TidyApplyService) };
}

describe('TidyApplyService', () => {
  it('applies the run, patches the feed, refreshes the counts and offers one Undo', async () => {
    const { api, toasts, links, counts, service } = await setup();
    expect(await service.apply(ITEMS)).toBe(true);
    expect(api.applyTidy).toHaveBeenCalledWith({ items: ITEMS });
    expect(links.patchLinks).toHaveBeenCalledWith([MOVED], true);
    expect(counts.folders.refresh).toHaveBeenCalled();
    expect(counts.tags.noteLinkSaved).toHaveBeenCalled();
    expect(counts.views.refresh).toHaveBeenCalled();
    expect(counts.tidy.load).toHaveBeenCalled();
    expect(toasts[0]).toEqual(
      expect.objectContaining({
        kind: TOAST_KIND.Moved,
        title: 'Tidied 1 link',
        detail: 'Moved into 1 folder, 3 tags added',
        folder: { colour: FOLDER?.colour, icon: FOLDER?.icon },
        duration: TOAST_DURATION_MS.Undo,
      }),
    );
  });

  it('reverts the whole run from the toast and lets the page read its list again', async () => {
    const { api, toasts, links, service } = await setup();
    const undone = vi.fn();
    await service.apply(ITEMS, undone);
    toasts[0]?.action?.run();
    await vi.waitFor(() => expect(undone).toHaveBeenCalled());
    expect(api.undoTidy).toHaveBeenCalledWith(RESPONSE.undo);
    expect(links.patchLinks).toHaveBeenLastCalledWith([TIDY_LINK], true);
    expect(links.refresh).toHaveBeenCalled();
    expect(toasts.at(-1)?.title).toBe('Tidy undone');
  });

  it('says so when the run or its Undo fails', async () => {
    const { api, toasts, service } = await setup();
    api.applyTidy.mockReturnValueOnce(throwError(() => new Error('down')));
    expect(await service.apply(ITEMS)).toBe(false);
    expect(toasts[0]).toEqual(
      expect.objectContaining({ kind: TOAST_KIND.Danger, title: 'Couldn’t tidy the links' }),
    );

    api.undoTidy.mockReturnValue(throwError(() => new Error('down')));
    await service.apply(ITEMS);
    toasts.at(-1)?.action?.run();
    await vi.waitFor(() => expect(toasts.at(-1)?.title).toBe('Couldn’t undo the tidy'));
  });

  it('names only the tags when nothing moved, and sends nothing for an empty run', async () => {
    const { api, toasts, service } = await setup();
    api.applyTidy.mockReturnValue(of({ ...RESPONSE, folders: 0, tagsAdded: 2 }));
    await service.apply(ITEMS);
    expect(toasts[0]).toEqual(
      expect.objectContaining({ kind: TOAST_KIND.Success, detail: '2 tags added' }),
    );
    expect(await service.apply([])).toBe(false);
    expect(api.applyTidy).toHaveBeenCalledTimes(1);
  });

  it('says there was nothing to apply when the suggestions changed meanwhile', async () => {
    const { api, toasts, links, service } = await setup();
    api.applyTidy.mockReturnValue(
      of({ links: [], applied: 0, folders: 0, tagsAdded: 0, skipped: 0, undo: { items: [] } }),
    );
    expect(await service.apply(ITEMS)).toBe(true);
    expect(links.patchLinks).toHaveBeenCalledWith([], false);
    expect(toasts).toEqual([
      expect.objectContaining({
        kind: TOAST_KIND.Info,
        title: 'Nothing to apply',
        detail: 'The suggestions changed meanwhile.',
      }),
    ]);
    expect(toasts[0]?.action).toBeUndefined();
  });
});
