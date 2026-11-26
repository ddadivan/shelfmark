import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  IMPORT_ERROR_MESSAGE,
  IMPORT_SOURCE,
  LINK_LIMIT,
  type ImportLinksResponse,
  type StartImportRequest,
} from '@shelfmark/contracts';
import { TOAST_KIND, ToastService, type ToastOptions } from '@shelfmark/ui';
import { Observable, of, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { TAB_SYNC_KIND } from '../../../core/sync/models/tab-sync-kind.const';
import { TabSyncService } from '../../../core/sync/tab-sync.service';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { RemindersStore } from '../../../stores/reminders.store';
import { SavedViewsStore } from '../../../stores/saved-views.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import { IMPORT_API } from '../models/import-api.const';
import type { ImportApi } from '../models/import-api.interface';
import { IMPORT_RUN_PHASE } from '../models/import-run-phase.const';
import type { ImportPlan } from '../models/import-plan.interface';
import type { ImportRunRequest } from '../models/import-run-request.interface';
import { ImportAiFollowService } from './import-ai-follow.service';
import { ImportRunService } from './import-run.service';
import { RecentImportsStore } from './recent-imports.store';

function plan(count: number, extra: Partial<ImportPlan> = {}): ImportPlan {
  return {
    folders: [{ key: 'f1', parentKey: null, name: 'Dev' }],
    links: Array.from({ length: count }, (_, index) => ({
      item: { url: `https://l${index}.example/`, idempotencyKey: `k${index}` },
      folderKey: index === 0 ? 'f1' : null,
    })),
    skipped: 0,
    ...extra,
  };
}

function request(
  count: number,
  extra: Partial<ImportPlan> = {},
  start: Partial<StartImportRequest> = {},
): ImportRunRequest {
  return {
    start: {
      source: IMPORT_SOURCE.Browser,
      fileName: 'b.html',
      newFolderName: 'Imported bookmarks',
      ...start,
    },
    plan: plan(count, extra),
    targetName: 'Imported bookmarks',
  };
}

const created = (count: number): ImportLinksResponse => ({
  created: count,
  replayed: 0,
  errors: [],
});

async function setup() {
  const api = {
    list: vi.fn(),
    get: vi.fn(),
    groups: vi.fn(),
    check: vi.fn(),
    start: vi.fn<ImportApi['start']>(() =>
      of({ id: 'imp1', targetFolderId: 'target1', folders: [{ key: 'f1', id: 'folder1' }] }),
    ),
    addLinks: vi.fn<ImportApi['addLinks']>((_id, body) => of(created(body.items.length))),
    finish: vi.fn<ImportApi['finish']>(() => of(undefined)),
    undo: vi.fn(),
  };
  const toasts: ToastOptions[] = [];
  const follow = { watch: vi.fn() };
  const refreshed = {
    folders: vi.fn(async () => undefined),
    tags: vi.fn(async () => undefined),
    reminders: vi.fn(async () => undefined),
    views: vi.fn(async () => undefined),
    pins: vi.fn(async () => undefined),
    trash: vi.fn(async () => undefined),
    links: vi.fn(),
    recent: vi.fn(async () => undefined),
    post: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideTranslocoForTest(),
      { provide: IMPORT_API, useValue: api },
      { provide: FoldersStore, useValue: { refresh: refreshed.folders } },
      { provide: TagsStore, useValue: { noteLinkSaved: refreshed.tags } },
      { provide: RemindersStore, useValue: { refresh: refreshed.reminders } },
      { provide: SavedViewsStore, useValue: { refresh: refreshed.views } },
      { provide: PinsStore, useValue: { refresh: refreshed.pins } },
      { provide: TrashStore, useValue: { refresh: refreshed.trash } },
      { provide: LinksStore, useValue: { refresh: refreshed.links } },
      { provide: RecentImportsStore, useValue: { load: refreshed.recent } },
      { provide: ImportAiFollowService, useValue: follow },
      { provide: TabSyncService, useValue: { post: refreshed.post } },
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
  return { api, toasts, refreshed, follow, service: TestBed.inject(ImportRunService) };
}

function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

describe('ImportRunService', () => {
  it('starts the import with the plan folders, sends the links and finishes with the counts', async () => {
    const { api, service } = await setup();
    service.dialogOpened();

    await service.start(request(3, { skipped: 2 }));

    expect(api.start).toHaveBeenCalledWith({
      source: IMPORT_SOURCE.Browser,
      fileName: 'b.html',
      newFolderName: 'Imported bookmarks',
      folders: [{ key: 'f1', parentKey: null, name: 'Dev' }],
    });
    expect(api.addLinks).toHaveBeenCalledTimes(1);
    expect(api.finish).toHaveBeenCalledWith('imp1', { skipped: 2, failed: 0 });
    expect(service.run()).toMatchObject({
      phase: IMPORT_RUN_PHASE.Done,
      importId: 'imp1',
      targetFolderId: 'target1',
      total: 3,
      processed: 3,
      created: 3,
      failed: 0,
      skipped: 2,
      folders: 2,
      targetName: 'Imported bookmarks',
    });
    expect(service.running()).toBe(false);
    expect(service.percent()).toBe(100);
  });

  it('maps a folder key to the id of the created folder and leaves other links without one', async () => {
    const { api, service } = await setup();

    await service.start(request(2));

    const [, body] = api.addLinks.mock.calls[0];
    expect(body.items[0]).toEqual({
      url: 'https://l0.example/',
      idempotencyKey: 'k0',
      folderId: 'folder1',
    });
    expect(body.items[1]).toEqual({ url: 'https://l1.example/', idempotencyKey: 'k1' });
    expect(body.skipRepeats).toBe(false);
  });

  it('splits the links into batches of at most the batch limit', async () => {
    const { api, service } = await setup();
    const total = LINK_LIMIT.BatchMax * 2 + 5;

    await service.start(request(total));

    expect(api.addLinks.mock.calls.map(([, body]) => body.items.length)).toEqual([
      LINK_LIMIT.BatchMax,
      LINK_LIMIT.BatchMax,
      5,
    ]);
    expect(service.run().created).toBe(total);
  });

  it('counts links the API skipped and replayed ones', async () => {
    const { api, service } = await setup();
    api.addLinks.mockReturnValue(
      of({
        created: 1,
        replayed: 1,
        errors: [{ index: 2, url: 'https://l2.example/', code: 'duplicate-in-batch' }],
      } as ImportLinksResponse),
    );

    await service.start(request(3, { skipped: 1 }));

    expect(service.run()).toMatchObject({ created: 2, skipped: 2, processed: 3 });
    expect(api.finish).toHaveBeenCalledWith('imp1', { skipped: 2, failed: 0 });
  });

  it('counts a batch that keeps failing (500, network) as failed after the retries and runs the next one', async () => {
    vi.useFakeTimers();
    try {
      const { api, service } = await setup();
      const total = LINK_LIMIT.BatchMax * 3;
      const bodies: string[] = [];
      api.addLinks.mockImplementation((_id, body) => {
        const first = body.items[0].idempotencyKey;
        if (!bodies.includes(first)) bodies.push(first);
        const failing = bodies.indexOf(first);
        if (failing === 0) return throwError(() => httpError(500));
        if (failing === 1) return throwError(() => new Error('network'));
        return of(created(body.items.length));
      });

      const done = service.start(request(total));
      await vi.advanceTimersByTimeAsync(20_000);
      await done;

      expect(api.addLinks).toHaveBeenCalledTimes(3 + 3 + 1);
      expect(service.run()).toMatchObject({
        phase: IMPORT_RUN_PHASE.Done,
        failed: LINK_LIMIT.BatchMax * 2,
        created: LINK_LIMIT.BatchMax,
        processed: total,
      });
      expect(api.finish).toHaveBeenCalledWith('imp1', {
        skipped: 0,
        failed: LINK_LIMIT.BatchMax * 2,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([429, 503, 0])(
    'retries a batch that failed with %i with the same keys, after 1 s and 3 s',
    async (status) => {
      vi.useFakeTimers();
      try {
        const { api, service } = await setup();
        api.addLinks
          .mockReturnValueOnce(throwError(() => httpError(status)))
          .mockReturnValueOnce(throwError(() => httpError(status)))
          .mockImplementation((_id, body) => of(created(body.items.length)));

        const done = service.start(request(2));
        await vi.advanceTimersByTimeAsync(0);
        expect(api.addLinks).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(999);
        expect(api.addLinks).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(api.addLinks).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(3000);
        await done;

        expect(api.addLinks).toHaveBeenCalledTimes(3);
        const keys = api.addLinks.mock.calls.map(([, body]) =>
          body.items.map((item) => item.idempotencyKey),
        );
        expect(keys[1]).toEqual(keys[0]);
        expect(keys[2]).toEqual(keys[0]);
        expect(service.run()).toMatchObject({ created: 2, failed: 0 });
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('does not retry a 400', async () => {
    const { api, service } = await setup();
    api.addLinks.mockReturnValue(throwError(() => httpError(400)));

    await service.start(request(2));

    expect(api.addLinks).toHaveBeenCalledTimes(1);
    expect(service.run()).toMatchObject({ failed: 2, created: 0 });
  });

  it.each([401, 403, 404, 409])(
    'stops on a %i and counts the rest of the links as failed',
    async (status) => {
      const { api, service } = await setup();
      const total = LINK_LIMIT.BatchMax * 3;
      api.addLinks
        .mockImplementationOnce((_id, body) => of(created(body.items.length)))
        .mockReturnValueOnce(throwError(() => httpError(status)));

      await service.start(request(total));

      expect(api.addLinks).toHaveBeenCalledTimes(2);
      expect(service.run()).toMatchObject({
        phase: IMPORT_RUN_PHASE.Done,
        created: LINK_LIMIT.BatchMax,
        failed: LINK_LIMIT.BatchMax * 2,
        processed: total,
      });
      expect(service.percent()).toBe(100);
    },
  );

  it('still ends done when finish fails, after trying it once more', async () => {
    vi.useFakeTimers();
    try {
      const { api, service } = await setup();
      api.finish.mockReturnValue(throwError(() => httpError(500)));

      const done = service.start(request(1));
      await vi.advanceTimersByTimeAsync(5000);
      await done;

      expect(api.finish).toHaveBeenCalledTimes(2);
      expect(service.run().phase).toBe(IMPORT_RUN_PHASE.Done);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fails with the folders-limit message when the start answers it, sending no links', async () => {
    const { api, service, refreshed } = await setup();
    api.start.mockReturnValue(
      throwError(() => mockHttpError(409, IMPORT_ERROR_MESSAGE.FoldersLimit)),
    );

    await service.start(request(2));

    expect(service.run()).toMatchObject({
      phase: IMPORT_RUN_PHASE.Failed,
      errorKey: 'import.progress.foldersLimit',
    });
    expect(api.addLinks).not.toHaveBeenCalled();
    expect(api.finish).not.toHaveBeenCalled();
    expect(refreshed.folders).not.toHaveBeenCalled();
  });

  it('fails with the generic start message for any other start failure', async () => {
    const { api, service } = await setup();
    api.start.mockReturnValue(throwError(() => httpError(500)));

    await service.start(request(2));

    expect(service.run()).toMatchObject({
      phase: IMPORT_RUN_PHASE.Failed,
      errorKey: 'import.progress.startFailed',
    });
  });

  it('reads the library again and tells the other tabs when the run ended', async () => {
    const { service, refreshed } = await setup();

    await service.start(request(1));

    expect(refreshed.folders).toHaveBeenCalled();
    expect(refreshed.tags).toHaveBeenCalled();
    expect(refreshed.pins).toHaveBeenCalled();
    expect(refreshed.reminders).toHaveBeenCalled();
    expect(refreshed.views).toHaveBeenCalled();
    expect(refreshed.trash).toHaveBeenCalled();
    expect(refreshed.links).toHaveBeenCalled();
    expect(refreshed.recent).toHaveBeenCalled();
    expect(refreshed.post).toHaveBeenCalledWith({ kind: TAB_SYNC_KIND.LibraryChanged });
  });

  it('shows a toast with the result only when the dialog was closed', async () => {
    const { service, toasts } = await setup();

    await service.start(request(3));

    expect(toasts).toEqual([{ kind: TOAST_KIND.Success, title: '3 links imported' }]);
  });

  it('shows no toast while the dialog is open, and shows one after it was closed again', async () => {
    const { service, toasts } = await setup();
    service.dialogOpened();
    await service.start(request(1));
    expect(toasts).toEqual([]);

    service.dialogOpened();
    service.dialogClosed();
    await service.start(request(1));

    expect(toasts).toEqual([{ kind: TOAST_KIND.Success, title: '1 link imported' }]);
  });

  it('ignores a start while a run is running', async () => {
    const { api, service } = await setup();
    api.start.mockReturnValue(of({ id: 'imp1', targetFolderId: null, folders: [] }));
    let release: (response: ImportLinksResponse) => void = () => undefined;
    api.addLinks.mockReturnValueOnce(
      new Observable<ImportLinksResponse>((subscriber) => {
        release = (response) => {
          subscriber.next(response);
          subscriber.complete();
        };
      }),
    );

    const first = service.start(request(1));
    await vi.waitFor(() => expect(api.addLinks).toHaveBeenCalled());
    expect(service.running()).toBe(true);
    await service.start(request(1));
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(service.percent()).toBe(0);

    release(created(1));
    await first;

    expect(service.running()).toBe(false);
  });

  it('starts over from idle when the dialog is opened after a finished run, and on reset', async () => {
    const { service } = await setup();
    await service.start(request(1));

    service.dialogOpened();
    expect(service.run().phase).toBe(IMPORT_RUN_PHASE.Idle);

    await service.start(request(1));
    service.reset();
    expect(service.run().phase).toBe(IMPORT_RUN_PHASE.Idle);
  });

  it('reports 100 percent for an empty plan', async () => {
    const { service } = await setup();

    expect(service.percent()).toBe(100);
  });

  describe('AI groups', () => {
    it('files a link into the existing folder it names, ahead of a folder key', async () => {
      const { api, service } = await setup();
      const base = request(2);

      await service.start({
        ...base,
        plan: {
          ...base.plan,
          links: [
            { ...base.plan.links[0], folderKey: 'f1', folderId: 'existing' },
            base.plan.links[1],
          ],
        },
      });

      const [, body] = api.addLinks.mock.calls[0];
      expect(body.items.map((item) => item.folderId)).toEqual(['existing', undefined]);
    });

    it('starts the AI follow-up for an import that asked for the pass, after the library refresh', async () => {
      const { follow, refreshed, service } = await setup();

      await service.start(request(3, {}, { aiPass: true }));

      expect(follow.watch).toHaveBeenCalledWith('imp1');
      expect(refreshed.post).toHaveBeenCalledWith({ kind: TAB_SYNC_KIND.LibraryChanged });
    });

    it('does not follow an import without the pass, or one that saved nothing', async () => {
      const first = await setup();
      await first.service.start(request(2));
      expect(first.follow.watch).not.toHaveBeenCalled();
      TestBed.resetTestingModule();

      const second = await setup();
      second.api.addLinks.mockReturnValue(throwError(() => httpError(400)));
      await second.service.start(request(2, {}, { aiPass: true }));
      expect(second.follow.watch).not.toHaveBeenCalled();
    });

    it('keeps the folders of the groups for the summary', async () => {
      const { service } = await setup();

      await service.start({ ...request(2), grouped: { folders: 3, created: 2 } });

      expect(service.run().grouped).toEqual({ folders: 3, created: 2 });
    });
  });
});
