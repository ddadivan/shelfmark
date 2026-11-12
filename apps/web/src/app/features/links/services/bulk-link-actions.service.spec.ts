import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TRASH_ITEM_KIND, type LinkResponse } from '@shelfmark/contracts';
import { MOCK_LINKS } from '@shelfmark/contracts/testing';
import {
  DialogService,
  TOAST_CLOSE_REASON,
  TOAST_KIND,
  ToastService,
  type ToastOptions,
} from '@shelfmark/ui';
import { of, throwError } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { TRASH_OUTCOME } from '../../trash/models/trash-outcome.const';
import type { TrashOutcome } from '../../trash/models/trash-outcome.type';
import { LINKS_API } from '../models/links-api.const';
import type { LinksApi } from '../models/links-api.interface';
import { LINKS_SCOPE } from '../models/links-scope.const';
import type { LinksFilter } from '../models/links-filter.type';
import type { MovePickerData } from '../models/move-picker-data.interface';
import { BulkLinkActionsService } from './bulk-link-actions.service';
import type { BulkTagsDialogData } from '../models/bulk-tags-dialog-data.interface';

const FOLDER = '00000000-0000-4000-8000-0000000000f1';

function link(n: number, changes: Partial<LinkResponse> = {}): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    url: `https://example.test/${n}`,
    folderId: null,
    isFavorite: false,
    tags: [],
    pinnedInFolderAt: null,
    ...changes,
  };
}

interface Options {
  confirmed?: boolean;
  dialogResult?: unknown;
  onDialog?: (data: unknown) => void;
  filter?: LinksFilter;
  window?: {
    open?: (href: string) => unknown;
    navigator?: { clipboard?: unknown; share?: unknown };
  };
}

async function setup(options: Options = {}) {
  const toasts: ToastOptions[] = [];
  const items = [link(1), link(2, { isFavorite: true }), link(3)];
  const api = {
    list: vi.fn<LinksApi['list']>(() => of({ items, nextCursor: null, pinned: [] })),
    updateBatch: vi.fn<LinksApi['updateBatch']>((request) =>
      of({
        updated: request.ids.length,
        links: request.ids.map((id) => {
          const base = items.find((item) => item.id === id) ?? link(0);
          return {
            ...base,
            ...(request.folderId === undefined ? {} : { folderId: request.folderId }),
            ...(request.isFavorite === undefined ? {} : { isFavorite: request.isFavorite }),
            tags: [...base.tags, ...(request.addTags ?? [])],
          };
        }),
      }),
    ),
    removeBatch: vi.fn<LinksApi['removeBatch']>((ids) => of({ deleted: ids.length })),
  };
  const confirm = vi.fn(() => Promise.resolve(options.confirmed ?? true));
  const dialogOpen = vi.fn((_component: unknown, config: { data: unknown }) => {
    options.onDialog?.(config.data);
    return { result: Promise.resolve(options.dialogResult) };
  });
  const restore = vi.fn((): Promise<TrashOutcome> => Promise.resolve(TRASH_OUTCOME.Done));
  const counts = {
    folders: { refresh: vi.fn(() => Promise.resolve()), pathTo: vi.fn(() => []) },
    tags: {
      noteLinkSaved: vi.fn(() => Promise.resolve()),
      load: vi.fn(() => Promise.resolve()),
      entities: () => [{ id: 't', name: 'video', linkCount: 4 }],
    },
    views: { refresh: vi.fn(() => Promise.resolve()) },
    pins: { dropLink: vi.fn(), refresh: vi.fn(() => Promise.resolve()) },
    trash: { refresh: vi.fn(() => Promise.resolve()), restore },
  };
  const opened: string[] = [];
  const fake = options.window ?? {
    open: (href: string) => {
      opened.push(href);
      return { opener: {} };
    },
    navigator: { clipboard: { writeText: vi.fn(() => Promise.resolve()) } },
  };
  vi.spyOn(window, 'open').mockImplementation(
    (href?: string | URL) => (fake.open?.(String(href)) ?? null) as Window | null,
  );
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: fake.navigator?.clipboard,
  });
  Object.defineProperty(navigator, 'share', { configurable: true, value: fake.navigator?.share });
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: DialogService, useValue: { confirm, open: dialogOpen } },
      {
        provide: ToastService,
        useValue: {
          show: (toast: ToastOptions) => {
            toasts.push(toast);
            return { dismiss: () => undefined, closed: new Promise(() => undefined) };
          },
        },
      },
      { provide: FoldersStore, useValue: counts.folders },
      { provide: TagsStore, useValue: counts.tags },
      { provide: SavedViewsStore, useValue: counts.views },
      { provide: PinsStore, useValue: counts.pins },
      { provide: TrashStore, useValue: counts.trash },
      { provide: UserSettingsStore, useValue: { retentionDays: () => 30 } },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(LinksStore);
  store.setFilter(options.filter ?? { scope: LINKS_SCOPE.All });
  await vi.waitFor(() => expect(store.loaded()).toBe(true));
  return {
    api,
    confirm,
    dialogOpen,
    toasts,
    store,
    counts,
    opened,
    bulk: TestBed.inject(BulkLinkActionsService),
  };
}

const byId = (store: InstanceType<typeof LinksStore>, id: string) => store.entityMap()[id];

describe('BulkLinkActionsService', () => {
  afterEach(() => vi.restoreAllMocks());
  describe('move', () => {
    it('asks for a folder with a multi-link title and moves all links in one request', async () => {
      let data: MovePickerData | undefined;
      const { bulk, api, store, toasts, counts } = await setup({
        onDialog: (d) => {
          data = d as MovePickerData;
          data.submit(FOLDER);
        },
      });
      const cleared = await bulk.move([link(1), link(3)]);
      expect(data?.heading).toBe('Move 2 links');
      expect(api.updateBatch).toHaveBeenCalledWith({ folderId: FOLDER, ids: ['id-1', 'id-3'] });
      expect(byId(store, 'id-1')?.folderId).toBe(FOLDER);
      expect(cleared).toBe(true);
      expect(toasts.at(-1)?.kind).toBe(TOAST_KIND.Moved);
      expect(toasts.at(-1)?.title).toBe('2 links moved to Unsorted');
      expect(counts.folders.refresh).toHaveBeenCalled();
      expect(counts.views.refresh).toHaveBeenCalled();
    });

    it('marks the shared folder as current and none for a mixed selection', async () => {
      const seen: MovePickerData[] = [];
      const { bulk } = await setup({ onDialog: (d) => seen.push(d as MovePickerData) });
      await bulk.move([link(1, { folderId: FOLDER }), link(2, { folderId: FOLDER })]);
      await bulk.move([link(1, { folderId: FOLDER }), link(2)]);
      expect(seen[0]?.currentIds).toEqual([FOLDER]);
      expect(seen[1]?.currentIds).toEqual([]);
    });

    it('moves a mixed selection to any folder, one of its own included', async () => {
      const { bulk, api } = await setup({
        onDialog: (d) => (d as MovePickerData).submit(FOLDER),
      });
      await bulk.move([link(1, { folderId: FOLDER }), link(2)]);
      expect(api.updateBatch).toHaveBeenCalledWith({ folderId: FOLDER, ids: ['id-2'] });
    });

    it('does nothing when the dialog is cancelled', async () => {
      const { bulk, api } = await setup();
      expect(await bulk.move([link(1)])).toBe(false);
      expect(api.updateBatch).not.toHaveBeenCalled();
    });

    it('takes links out of a folder view and Undo moves each back to its own folder', async () => {
      const { bulk, api, store, toasts } = await setup({
        filter: { scope: LINKS_SCOPE.Unsorted },
      });
      await bulk.moveTo([link(1), link(3)], FOLDER);
      expect(store.entities().map((item) => item.id)).toEqual(['id-2']);
      toasts.at(-1)?.action?.run();
      await vi.waitFor(() =>
        expect(api.updateBatch).toHaveBeenLastCalledWith({ folderId: null, ids: ['id-1', 'id-3'] }),
      );
    });

    it('rolls back and offers a retry when the request fails', async () => {
      const { bulk, api, store, toasts } = await setup();
      api.updateBatch.mockReturnValueOnce(throwError(() => new Error('down')));
      expect(await bulk.moveTo([link(1)], FOLDER)).toBe(false);
      expect(byId(store, 'id-1')?.folderId).toBeNull();
      expect(toasts.at(-1)?.kind).toBe(TOAST_KIND.Danger);
      expect(toasts.at(-1)?.title).toBe("Couldn't move the links");
      expect(toasts.at(-1)?.action?.label).toBe('Retry');
    });

    it('skips links already in the folder', async () => {
      const { bulk, api } = await setup();
      expect(await bulk.moveTo([link(1, { folderId: FOLDER })], FOLDER)).toBe(true);
      expect(api.updateBatch).not.toHaveBeenCalled();
    });
  });

  describe('tags', () => {
    it('offers every tag to add and the selected links’ tags to remove', async () => {
      let data: BulkTagsDialogData | undefined;
      const { bulk } = await setup({ onDialog: (d) => (data = d as BulkTagsDialogData) });
      await bulk.editTags([link(1, { tags: ['css'] }), link(2, { tags: ['css', 'a'] })]);
      expect(data?.heading).toBe('Tags for 2 links');
      expect(data?.suggestions.map((s) => s.name)).toEqual(['video']);
      expect(data?.present).toEqual([
        { name: 'css', countLabel: 'on 2 of 2' },
        { name: 'a', countLabel: 'on 1 of 2' },
      ]);
    });

    it('adds and removes in one request, optimistic, and refreshes the tag counts', async () => {
      const { bulk, api, store, toasts, counts } = await setup({
        dialogResult: { add: ['new'], remove: ['old'] },
      });
      await bulk.editTags([link(1, { tags: ['old'] })]);
      expect(api.updateBatch).toHaveBeenCalledWith({
        addTags: ['new'],
        removeTags: ['old'],
        ids: ['id-1'],
      });
      expect(byId(store, 'id-1')?.tags).toContain('new');
      expect(counts.tags.noteLinkSaved).toHaveBeenCalled();
      expect(toasts.at(-1)?.title).toBe('Tags updated on 1 link');
    });

    it('says when a link would pass the tag limit and rolls back', async () => {
      const { bulk, api, store, toasts } = await setup();
      api.updateBatch.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status: HttpStatusCode.Conflict })),
      );
      expect(await bulk.applyTags([link(1)], { add: ['x'], remove: [] })).toBe(false);
      expect(byId(store, 'id-1')?.tags).toEqual([]);
      expect(toasts.at(-1)?.detail).toBe('A link can have at most 20 tags. Nothing was changed.');
    });

    it('does nothing when the dialog closes without a change', async () => {
      const { bulk, api } = await setup();
      await bulk.editTags([link(1)]);
      expect(api.updateBatch).not.toHaveBeenCalled();
    });
  });

  describe('favorite', () => {
    it('turns favorite on for all when any is off', async () => {
      const { bulk, api, store, toasts } = await setup();
      await bulk.toggleFavorite([link(1), link(2, { isFavorite: true })]);
      expect(api.updateBatch).toHaveBeenCalledWith({ isFavorite: true, ids: ['id-1', 'id-2'] });
      expect(byId(store, 'id-1')?.isFavorite).toBe(true);
      expect(toasts.at(-1)?.title).toBe('2 links added to favorites');
    });

    it('turns favorite off when all are on, and rolls back on failure', async () => {
      const { bulk, api, store, toasts } = await setup();
      api.updateBatch.mockReturnValueOnce(throwError(() => new Error('down')));
      await bulk.toggleFavorite([link(2, { isFavorite: true })]);
      expect(api.updateBatch).toHaveBeenCalledWith({ isFavorite: false, ids: ['id-2'] });
      expect(byId(store, 'id-2')?.isFavorite).toBe(true);
      expect(toasts.at(-1)?.title).toBe("Couldn't change favorites");
    });
  });

  describe('open all', () => {
    it('opens a tab per link without an opener', async () => {
      const { bulk, opened, confirm } = await setup();
      await bulk.openAll([link(1), link(2)]);
      expect(opened).toEqual(['https://example.test/1', 'https://example.test/2']);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('asks first above 10 links and stops when declined', async () => {
      const { bulk, opened, confirm } = await setup({ confirmed: false });
      await bulk.openAll(Array.from({ length: 11 }, (_, i) => link(i + 1)));
      expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Open 11 links?' }));
      expect(opened).toEqual([]);
    });

    it('says how many tabs a pop-up blocker stopped', async () => {
      const open = vi.fn(() => null);
      const { bulk, toasts } = await setup({ window: { open } });
      await bulk.openAll([link(1), link(2), link(3, { url: 'javascript:alert(1)' })]);
      expect(open).toHaveBeenCalledTimes(2);
      expect(toasts.at(-1)?.kind).toBe(TOAST_KIND.Warn);
      expect(toasts.at(-1)?.title).toBe('The browser blocked 2 of 2 tabs');
    });
  });

  describe('copy and share', () => {
    it('copies the URLs one per line', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      const { bulk, toasts } = await setup({
        window: { navigator: { clipboard: { writeText } } },
      });
      await bulk.copy([link(1), link(2)]);
      expect(writeText).toHaveBeenCalledWith('https://example.test/1\nhttps://example.test/2');
      expect(toasts.at(-1)?.title).toBe('2 links copied');
    });

    it('says when the clipboard is not available', async () => {
      const { bulk, toasts } = await setup({ window: { navigator: {} } });
      await bulk.copy([link(1)]);
      expect(toasts.at(-1)?.title).toBe("Couldn't copy the links");
    });

    it('shares the URLs as text when the browser can, quietly when cancelled', async () => {
      const share = vi
        .fn<(data: { text?: string }) => Promise<void>>()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new DOMException('cancel', 'AbortError'))
        .mockRejectedValueOnce(new Error('broken'));
      const { bulk, toasts } = await setup({ window: { navigator: { share } } });
      expect(bulk.canShare()).toBe(true);
      await bulk.share([link(1), link(2)]);
      expect(share).toHaveBeenCalledWith({
        text: 'https://example.test/1\nhttps://example.test/2',
      });
      await bulk.share([link(1)]);
      expect(toasts).toHaveLength(0);
      await bulk.share([link(1)]);
      expect(toasts.at(-1)?.title).toBe("Couldn't share the links");
    });

    it('cannot share without the Web Share API', async () => {
      const { bulk } = await setup({ window: { navigator: {} } });
      expect(bulk.canShare()).toBe(false);
      expect(await bulk.share([link(1)])).toBe(false);
    });
  });

  describe('delete', () => {
    it('does nothing when the confirmation is declined', async () => {
      const { bulk, api } = await setup({ confirmed: false });
      expect(await bulk.delete([link(1)])).toBe(false);
      expect(api.removeBatch).not.toHaveBeenCalled();
    });

    it('moves the links to Trash at once and Undo restores them through Trash', async () => {
      const { bulk, api, store, toasts, counts, confirm } = await setup();
      const cleared = await bulk.delete([link(1), link(3)]);
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Move 2 links to Trash?', destructive: true }),
      );
      expect(api.removeBatch).toHaveBeenCalledWith(['id-1', 'id-3']);
      expect(store.entities().map((item) => item.id)).toEqual(['id-2']);
      expect(cleared).toBe(true);
      expect(counts.pins.dropLink).toHaveBeenCalledWith('id-1');
      expect(counts.trash.refresh).toHaveBeenCalled();
      const toast = toasts.at(-1);
      expect(toast?.title).toBe('2 links moved to Trash');
      expect(toast?.detail).toBe('Link 1, Link 3');
      toast?.action?.run();
      await vi.waitFor(() =>
        expect(counts.trash.restore).toHaveBeenCalledWith([
          { kind: TRASH_ITEM_KIND.Link, id: 'id-1' },
          { kind: TRASH_ITEM_KIND.Link, id: 'id-3' },
        ]),
      );
      expect(TOAST_CLOSE_REASON.Action).toBe('action');
    });

    it('says when the Undo restore failed', async () => {
      const { bulk, toasts, counts } = await setup();
      counts.trash.restore.mockResolvedValueOnce(TRASH_OUTCOME.Failed);
      await bulk.delete([link(1)]);
      toasts.at(-1)?.action?.run();
      await vi.waitFor(() => expect(toasts.at(-1)?.title).toBe("Couldn't restore the links"));
    });

    it('brings the links back with a toast when the request fails', async () => {
      const { bulk, api, store, toasts } = await setup();
      api.removeBatch.mockReturnValueOnce(throwError(() => new Error('down')));
      expect(await bulk.delete([link(1)])).toBe(false);
      expect(store.entities().map((item) => item.id)).toEqual(['id-1', 'id-2', 'id-3']);
      expect(toasts.at(-1)?.title).toBe("Couldn't delete the links");
    });

    it('sends more than 100 links in batches of 100', async () => {
      const { bulk, api } = await setup();
      await bulk.delete(Array.from({ length: 150 }, (_, i) => link(i + 10)));
      expect(api.removeBatch).toHaveBeenCalledTimes(2);
      expect(api.removeBatch.mock.calls[0]?.[0]).toHaveLength(100);
      expect(api.removeBatch.mock.calls[1]?.[0]).toHaveLength(50);
    });
  });
});
