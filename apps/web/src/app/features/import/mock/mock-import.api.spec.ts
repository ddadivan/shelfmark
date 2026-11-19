import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  IMPORT_ERROR_MESSAGE,
  IMPORT_SOURCE,
  LINK_BATCH_ERROR_CODE,
  TRASH_ITEM_KIND,
  type ImportLinkItem,
  type StartImportRequest,
  type StartImportResponse,
} from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MOCK_HOST } from '../../links/models/mock-host.const';
import { MockImportApi } from './mock-import.api';

type Outcome<T> = { value: T; error: null } | { value: null; error: HttpErrorResponse | Error };

/** Subscribes and lets the mock latency pass (fake timers). */
async function settle<T>(source: Observable<T>): Promise<Outcome<T>> {
  const result = firstValueFrom(source).then(
    (value): Outcome<T> => ({ value, error: null }),
    (error: HttpErrorResponse | Error): Outcome<T> => ({ value: null, error }),
  );
  await vi.advanceTimersByTimeAsync(1000);
  return result;
}

async function ok<T>(source: Observable<T>): Promise<T> {
  const outcome = await settle(source);
  if (outcome.error) {
    throw outcome.error;
  }
  return outcome.value;
}

const START: StartImportRequest = {
  source: IMPORT_SOURCE.Browser,
  fileName: 'bookmarks.html',
  newFolderName: 'Imported bookmarks',
  folders: [
    { key: 'f1', parentKey: null, name: 'Dev' },
    { key: 'f2', parentKey: 'f1', name: 'Angular' },
  ],
};

let counter = 0;
function item(url: string, extra: Partial<ImportLinkItem> = {}): ImportLinkItem {
  counter += 1;
  return { url, idempotencyKey: `key-${counter}`, ...extra };
}

function setup() {
  const api = TestBed.inject(MockImportApi);
  const data = TestBed.inject(MockLibraryData);
  return { api, data };
}

async function started(
  api: MockImportApi,
  request: StartImportRequest = START,
): Promise<StartImportResponse> {
  return ok(api.start(request));
}

describe('MockImportApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T10:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  describe('start', () => {
    it('creates the new target folder with the file folders nested below it', async () => {
      const { api, data } = setup();
      const before = data.folderList.length;

      const response = await started(api);

      expect(data.folderList).toHaveLength(before + 3);
      const target = data.folderList.find((folder) => folder.id === response.targetFolderId);
      expect(target).toMatchObject({ name: 'Imported bookmarks', parentId: null });
      const [dev, angular] = response.folders.map((folder) =>
        data.folderList.find((item) => item.id === folder.id),
      );
      expect(dev).toMatchObject({ name: 'Dev', parentId: target?.id });
      expect(angular).toMatchObject({ name: 'Angular', parentId: dev?.id });
      expect(response.folders.map((folder) => folder.key)).toEqual(['f1', 'f2']);
    });

    it('puts the file folders into an existing target folder', async () => {
      const { api, data } = setup();
      const existing = data.folderList[0];

      const response = await started(api, {
        source: IMPORT_SOURCE.Browser,
        fileName: 'b.html',
        targetFolderId: existing.id,
        folders: [{ key: 'f1', parentKey: null, name: 'Dev' }],
      });

      expect(response.targetFolderId).toBe(existing.id);
      const created = data.folderList.find((folder) => folder.id === response.folders[0].id);
      expect(created?.parentId).toBe(existing.id);
    });

    it('answers a null target for Unsorted', async () => {
      const { api } = setup();

      const response = await started(api, {
        source: IMPORT_SOURCE.Browser,
        fileName: 'b.html',
        folders: [],
      });

      expect(response.targetFolderId).toBeNull();
    });

    it('fails with 400 when both an existing folder and a new name are given', async () => {
      const { api, data } = setup();

      const outcome = await settle(api.start({ ...START, targetFolderId: data.folderList[0].id }));

      expect(outcome.error).toBeInstanceOf(HttpErrorResponse);
      expect((outcome.error as HttpErrorResponse).status).toBe(400);
    });

    it('fails with 404 when the target folder does not exist', async () => {
      const { api } = setup();

      const outcome = await settle(
        api.start({
          source: IMPORT_SOURCE.Browser,
          fileName: 'b.html',
          targetFolderId: 'missing',
          folders: [],
        }),
      );

      expect((outcome.error as HttpErrorResponse).status).toBe(404);
    });

    it('fails with 409 when the folders do not fit the folder limit', async () => {
      const { api } = setup();
      const folders = Array.from({ length: 1001 }, (_, index) => ({
        key: `f${index}`,
        parentKey: null,
        name: `F${index}`,
      }));

      const outcome = await settle(api.start({ ...START, folders }));

      const error = outcome.error as HttpErrorResponse;
      expect(error.status).toBe(409);
      expect((error.error as { message: string }).message).toBe(IMPORT_ERROR_MESSAGE.FoldersLimit);
    });
  });

  describe('addLinks', () => {
    it('creates links with folder, tags, note and addedAt, and records the new tags', async () => {
      const { api, data } = setup();
      const response = await started(api);
      const folderId = response.folders[1].id;

      const result = await ok(
        api.addLinks(response.id, {
          items: [
            item('https://angular.dev/guide', {
              title: 'Guide',
              folderId,
              tags: ['Imported-Tag', 'imported-tag'],
              note: 'read me',
              addedAt: '2020-05-01T08:00:00.000Z',
            }),
          ],
        }),
      );

      expect(result).toEqual({ created: 1, replayed: 0, errors: [] });
      const link = data.links.find((entry) => entry.url === 'https://angular.dev/guide');
      expect(link).toMatchObject({
        title: 'Guide',
        folderId,
        note: 'read me',
        tags: ['Imported-Tag'],
        createdAt: '2020-05-01T08:00:00.000Z',
      });
      expect(data.tagList.map((tag) => tag.name)).toContain('Imported-Tag');
    });

    it('puts a link without a folder into the import target', async () => {
      const { api, data } = setup();
      const response = await started(api);

      await ok(api.addLinks(response.id, { items: [item('https://target.example/')] }));

      expect(data.links.find((link) => link.url === 'https://target.example/')?.folderId).toBe(
        response.targetFolderId,
      );
    });

    it('replays a known idempotency key without creating the link again', async () => {
      const { api, data } = setup();
      const response = await started(api);
      const batch = { items: [item('https://replay.example/')] };
      await ok(api.addLinks(response.id, batch));
      const count = data.links.length;

      const again = await ok(api.addLinks(response.id, batch));

      expect(again).toEqual({ created: 0, replayed: 1, errors: [] });
      expect(data.links).toHaveLength(count);
    });

    it('skips repeats inside the batch by default and keeps them with skipRepeats false', async () => {
      const { api } = setup();
      const response = await started(api);
      const first = await ok(
        api.addLinks(response.id, {
          items: [item('https://same.example/a'), item('https://same.example/a')],
        }),
      );
      const kept = await ok(
        api.addLinks(response.id, {
          items: [item('https://same.example/b'), item('https://same.example/b')],
          skipRepeats: false,
        }),
      );

      expect(first.created).toBe(1);
      expect(first.errors).toEqual([
        { index: 1, url: 'https://same.example/a', code: LINK_BATCH_ERROR_CODE.DuplicateInBatch },
      ]);
      expect(kept).toEqual({ created: 2, replayed: 0, errors: [] });
    });

    it('fails the batch for a link on the save-fails host', async () => {
      const { api, data } = setup();
      const response = await started(api);
      const count = data.links.length;

      const outcome = await settle(
        api.addLinks(response.id, {
          items: [item('https://ok.example/'), item(`https://${MOCK_HOST.SaveFails}/x`)],
        }),
      );

      expect(outcome.error).toBeInstanceOf(Error);
      expect(data.links).toHaveLength(count);
    });

    it('fails with 404 for an unknown import', async () => {
      const { api } = setup();

      const outcome = await settle(api.addLinks('nope', { items: [item('https://a.example/')] }));

      expect((outcome.error as HttpErrorResponse).status).toBe(404);
    });

    it('fails with 409 Closed after the import was undone', async () => {
      const { api } = setup();
      const response = await started(api);
      await ok(api.undo(response.id));

      const outcome = await settle(
        api.addLinks(response.id, { items: [item('https://late.example/')] }),
      );

      const error = outcome.error as HttpErrorResponse;
      expect(error.status).toBe(409);
      expect((error.error as { message: string }).message).toBe(IMPORT_ERROR_MESSAGE.Closed);
    });
  });

  describe('check', () => {
    it('returns the indexes of URLs that are already saved', async () => {
      const { api, data } = setup();
      const saved = data.links[0].url;

      const result = await ok(api.check(['https://new.example/', saved, 'https://other.example/']));

      expect(result).toEqual({ saved: [1] });
    });
  });

  describe('list', () => {
    it('lists a started import with its counts after finish', async () => {
      const { api } = setup();
      const response = await started(api);
      await ok(api.addLinks(response.id, { items: [item('https://l.example/')] }));
      await ok(api.finish(response.id, { skipped: 3, failed: 1 }));

      const { items } = await ok(api.list());

      expect(items[0]).toMatchObject({
        id: response.id,
        fileName: 'bookmarks.html',
        targetFolderId: response.targetFolderId,
        linksCreated: 1,
        foldersCreated: 3,
        skipped: 3,
        failed: 1,
      });
      expect(items[0].finishedAt).not.toBeNull();
    });

    it('hides an undone import and one older than the undo window', async () => {
      const { api } = setup();
      const undone = await started(api);
      await ok(api.undo(undone.id));
      const old = await started(api);
      vi.setSystemTime(new Date('2026-11-27T10:00:00.000Z'));

      const { items } = await ok(api.list());

      expect(items.map((entry) => entry.id)).not.toContain(undone.id);
      expect(items.map((entry) => entry.id)).not.toContain(old.id);
    });

    it('shows a null target once the target folder is gone', async () => {
      const { api, data } = setup();
      const response = await started(api);
      data.setFolders(data.folderList.filter((folder) => folder.id !== response.targetFolderId));

      const { items } = await ok(api.list());

      expect(items[0].targetFolderId).toBeNull();
    });
  });

  describe('finish', () => {
    it('fails with 404 for an unknown import', async () => {
      const { api } = setup();

      const outcome = await settle(api.finish('nope', { skipped: 0, failed: 0 }));

      expect((outcome.error as HttpErrorResponse).status).toBe(404);
    });
  });

  describe('undo', () => {
    it('trashes the import folder as one Trash entry with the links it created', async () => {
      const { api, data } = setup();
      const trashBefore = data.trash.length;
      const response = await started(api);
      await ok(
        api.addLinks(response.id, {
          items: [
            item('https://u1.example/', { folderId: response.folders[0].id }),
            item('https://u2.example/'),
          ],
        }),
      );

      const result = await ok(api.undo(response.id));

      expect(result).toEqual({ links: 2, folders: 3, tags: 0 });
      expect(data.trash).toHaveLength(trashBefore + 1);
      expect(data.trash[0]).toMatchObject({
        kind: TRASH_ITEM_KIND.Folder,
        id: response.targetFolderId,
      });
      expect(data.trash[0].folders).toHaveLength(3);
      expect(data.trash[0].links.map((link) => link.url).sort()).toEqual([
        'https://u1.example/',
        'https://u2.example/',
      ]);
      expect(data.links.some((link) => link.url.includes('u1.example'))).toBe(false);
    });

    it('moves a link the user added to an import folder to Unsorted', async () => {
      const { api, data } = setup();
      const response = await started(api);
      const mine = { ...data.links[0], id: 'mine', folderId: response.folders[0].id };
      data.links = [mine, ...data.links];

      await ok(api.undo(response.id));

      expect(data.links.find((link) => link.id === 'mine')?.folderId).toBeNull();
    });

    it('removes only the new tags no other link uses', async () => {
      const { api, data } = setup();
      const response = await started(api);
      const existingTag = data.tagList[0].name;
      await ok(
        api.addLinks(response.id, {
          items: [item('https://t1.example/', { tags: ['brand-new', 'shared-new', existingTag] })],
        }),
      );
      data.links = [
        { ...data.links[0], id: 'other', folderId: null, tags: ['shared-new'] },
        ...data.links,
      ];

      const result = await ok(api.undo(response.id));

      const names = data.tagList.map((tag) => tag.name);
      expect(result.tags).toBe(1);
      expect(names).not.toContain('brand-new');
      expect(names).toContain('shared-new');
      expect(names).toContain(existingTag);
    });

    it('fails with 409 on the second undo and 404 for an unknown import', async () => {
      const { api } = setup();
      const response = await started(api);
      await ok(api.undo(response.id));

      const second = await settle(api.undo(response.id));
      const unknown = await settle(api.undo('nope'));

      const error = second.error as HttpErrorResponse;
      expect(error.status).toBe(409);
      expect((error.error as { message: string }).message).toBe(IMPORT_ERROR_MESSAGE.UndoGone);
      expect((unknown.error as HttpErrorResponse).status).toBe(404);
    });
  });
});
