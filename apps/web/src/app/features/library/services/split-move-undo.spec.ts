import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { FolderResponse, LinkResponse, ListLinksResponse } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_LIBRARY_COUNTS, MOCK_LINKS } from '@shelfmark/contracts/testing';
import { DialogService, ToastService, type ToastOptions } from '@shelfmark/ui';
import { of } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { FOLDERS_API } from '../../links/models/folders-api.const';
import type { FoldersApi } from '../../links/models/folders-api.interface';
import { LINKS_API } from '../../links/models/links-api.const';
import type { LinksApi } from '../../links/models/links-api.interface';
import { LINKS_SCOPE } from '../../links/models/links-scope.const';
import { BulkLinkActionsService } from '../../links/services/bulk-link-actions.service';
import { LinkActionsService } from '../../links/services/link-actions.service';
import type { SplitTarget } from '../models/split-target.type';
import { SplitFeedStore } from './split-feed.store';
import { SplitViewService } from './split-view.service';

const FOLDER = MOCK_FOLDERS[0] as FolderResponse;

function link(n: number, folderId: string | null): LinkResponse {
  return {
    ...MOCK_LINKS[0],
    id: `id-${n}`,
    title: `Link ${n}`,
    folderId,
    pinnedInFolderAt: null,
    isFavorite: false,
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));

/** Left half: Unsorted (links 1 to 3). Right half: the folder (link 9). Real stores, mocked API and toasts. */
async function setup(rightTarget: SplitTarget = FOLDER.id) {
  const unsorted = [link(1, null), link(2, null), link(3, null)];
  const inFolder = [link(9, FOLDER.id)];
  const toasts: ToastOptions[] = [];
  const api = {
    list: vi.fn<LinksApi['list']>((query) =>
      of({
        items: query?.folderId === FOLDER.id ? inFolder : unsorted,
        nextCursor: null,
        pinned: [],
      } satisfies ListLinksResponse),
    ),
    recent: vi.fn<LinksApi['recent']>(() => of({ items: [] })),
    update: vi.fn<LinksApi['update']>((id, request) =>
      of({ ...link(Number(id.slice(3)), null), ...request }),
    ),
    updateBatch: vi.fn<LinksApi['updateBatch']>((request) =>
      of({
        updated: request.ids.length,
        links: request.ids.map((id) => ({
          ...link(Number(id.slice(3)), null),
          ...(request.folderId !== undefined && { folderId: request.folderId }),
        })),
      }),
    ),
  };
  const foldersApi = {
    list: vi.fn<FoldersApi['list']>(() => of({ items: [FOLDER], counts: MOCK_LIBRARY_COUNTS })),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: LINKS_API, useValue: api },
      { provide: FOLDERS_API, useValue: foldersApi },
      { provide: DialogService, useValue: { confirm: vi.fn(), open: vi.fn() } },
      {
        provide: ToastService,
        useValue: {
          show: (options: ToastOptions) => {
            toasts.push(options);
            return { dismiss: vi.fn(), closed: new Promise(() => undefined) };
          },
        },
      },
      { provide: SplitViewService, useValue: { rightTarget: signal(rightTarget) } },
      SplitFeedStore,
    ],
  });
  await loadEnglish();
  const left = TestBed.inject(LinksStore);
  left.setFilter({ scope: LINKS_SCOPE.Unsorted });
  const right = TestBed.inject(SplitFeedStore);
  await TestBed.inject(FoldersStore).load();
  TestBed.tick();
  await flush();
  return { left, right, toasts, api, actions: TestBed.inject(LinkActionsService) };
}

const ids = (store: { entities: () => readonly LinkResponse[] }) =>
  store.entities().map((item) => item.id);

describe('moving a link between the halves and Undo', () => {
  it('moves a link from the left half to the right half and says where', async () => {
    const { left, right, toasts, actions } = await setup();

    await actions.moveTo(link(2, null), FOLDER.id);

    expect(ids(left)).toEqual(['id-1', 'id-3']);
    expect(ids(right)).toEqual(['id-2', 'id-9']);
    expect(toasts[0].kind).toBe('moved');
    expect(toasts[0].title).toContain(FOLDER.name);
  });

  it('puts the link back at its slot in both halves on Undo', async () => {
    const { left, right, toasts, actions } = await setup();
    await actions.moveTo(link(2, null), FOLDER.id);

    toasts[0].action?.run();
    await flush();

    expect(ids(left)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(ids(right)).toEqual(['id-9']);
  });

  it('moves a link back from the right half to Unsorted on the left, and Undo reverses it', async () => {
    const { left, right, toasts, actions } = await setup();

    await actions.moveTo(link(9, FOLDER.id), null);
    expect(ids(left)).toEqual(['id-9', 'id-1', 'id-2', 'id-3']);
    expect(ids(right)).toEqual([]);

    toasts[0].action?.run();
    await flush();

    expect(ids(left)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(ids(right)).toEqual(['id-9']);
  });

  it('puts several links back in both halves when the bulk Undo runs', async () => {
    const { left, right, toasts } = await setup();
    const bulk = TestBed.inject(BulkLinkActionsService);

    expect(await bulk.moveTo([link(1, null), link(3, null)], FOLDER.id)).toBe(true);
    expect(ids(left)).toEqual(['id-2']);
    expect(ids(right)).toEqual(['id-1', 'id-3', 'id-9']);

    toasts[0].action?.run();
    await flush();

    expect(ids(left)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(ids(right)).toEqual(['id-9']);
  });
});
