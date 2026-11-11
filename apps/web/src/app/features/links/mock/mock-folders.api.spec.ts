import { Injector, runInInjectionContext } from '@angular/core';
import { FOLDER_DELETE_MODE, FOLDER_LIMIT } from '@shelfmark/contracts';
import { MOCK_FOLDERS, MOCK_ID } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MOCK_FOLDER_NAME } from '../models/mock-folder-name.const';
import { MockFoldersApi } from './mock-folders.api';
import { MockLibraryData } from './mock-library-data';
import { MockLinksApi } from './mock-links.api';

function create() {
  const injector = Injector.create({ providers: [MockLibraryData] });
  return runInInjectionContext(injector, () => ({
    folders: new MockFoldersApi(),
    links: new MockLinksApi(),
    data: injector.get(MockLibraryData),
  }));
}

describe('MockFoldersApi', () => {
  it('lists folders with counts derived from the links, and the fixed-row counts', async () => {
    const { folders, data } = create();

    const { items, counts } = await firstValueFrom(folders.list());

    expect(items.map((folder) => folder.id)).toEqual([
      MOCK_ID.FolderAngular,
      MOCK_ID.FolderReading,
    ]);
    expect(items[1].linkCount).toBe(
      data.links.filter((l) => l.folderId === MOCK_ID.FolderReading).length,
    );
    expect(counts.all).toBe(data.links.length);
    expect(counts.unsorted).toBe(data.links.filter((l) => l.folderId === null).length);
  });

  it('creates a folder and lists it', async () => {
    const { folders } = create();

    const created = await firstValueFrom(
      folders.create({ name: 'Zeta', parentId: MOCK_ID.FolderReading }),
    );
    const { items } = await firstValueFrom(folders.list());

    expect(created).toMatchObject({ name: 'Zeta', parentId: MOCK_ID.FolderReading, linkCount: 0 });
    expect(items.map((folder) => folder.name)).toContain('Zeta');
  });

  it('rejects a missing parent, the limit and the failing name', async () => {
    const { folders, data } = create();

    await expect(firstValueFrom(folders.create({ name: 'x', parentId: 'nope' }))).rejects.toThrow();
    await expect(
      firstValueFrom(folders.create({ name: MOCK_FOLDER_NAME.CreateFails })),
    ).rejects.toThrow('Mock: folder create failed');
    data.setFolders(
      Array.from({ length: FOLDER_LIMIT.PerUserMax }, (_, i) => ({
        ...MOCK_FOLDERS[0],
        id: `f${i}`,
      })),
    );
    await expect(firstValueFrom(folders.create({ name: 'one more' }))).rejects.toThrow();
  });

  it('renames and moves, and refuses a cycle', async () => {
    const { folders } = create();

    const renamed = await firstValueFrom(folders.update(MOCK_ID.FolderAngular, { name: 'NG' }));
    const moved = await firstValueFrom(folders.update(MOCK_ID.FolderAngular, { parentId: null }));

    expect(renamed.name).toBe('NG');
    expect(moved.parentId).toBeNull();
    await expect(
      firstValueFrom(folders.update(MOCK_ID.FolderReading, { parentId: MOCK_ID.FolderReading })),
    ).rejects.toThrow('Mock: folder update failed');
    await firstValueFrom(
      folders.update(MOCK_ID.FolderAngular, { parentId: MOCK_ID.FolderReading }),
    );
    await expect(
      firstValueFrom(folders.update(MOCK_ID.FolderReading, { parentId: MOCK_ID.FolderAngular })),
    ).rejects.toThrow();
  });

  it('fails an update or a delete for the failing names', async () => {
    const { folders } = create();
    const update = await firstValueFrom(folders.create({ name: MOCK_FOLDER_NAME.UpdateFails }));
    const doomed = await firstValueFrom(folders.create({ name: MOCK_FOLDER_NAME.DeleteFails }));

    await expect(firstValueFrom(folders.update(update.id, { name: 'x' }))).rejects.toThrow();
    await expect(
      firstValueFrom(folders.remove(doomed.id, FOLDER_DELETE_MODE.MoveToUnsorted)),
    ).rejects.toThrow('Mock: folder delete failed');
  });

  it('moves the links of a deleted subtree to unsorted', async () => {
    const { folders, links, data } = create();
    const before = data.links.filter((l) => l.folderId === MOCK_ID.FolderReading).length;
    expect(before).toBeGreaterThan(0);

    await firstValueFrom(folders.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.MoveToUnsorted));

    const { items } = await firstValueFrom(folders.list());
    expect(items).toEqual([]);
    const unsorted = await firstValueFrom(links.list({ unsorted: true, limit: 100 }));
    expect(unsorted.items.length).toBeGreaterThanOrEqual(before);
  });

  it('deletes the links of the whole subtree in delete mode', async () => {
    const { folders, data } = create();
    const inSubtree = data.links.filter(
      (l) => l.folderId === MOCK_ID.FolderReading || l.folderId === MOCK_ID.FolderAngular,
    ).length;
    const total = data.links.length;

    await firstValueFrom(folders.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.DeleteLinks));

    expect(data.links).toHaveLength(total - inSubtree);
  });

  it('reorders the subfolders of one parent like the API and keeps updatedAt', async () => {
    const { folders } = create();
    const one = await firstValueFrom(folders.create({ name: 'One' }));
    const two = await firstValueFrom(folders.create({ name: 'Two' }));
    // Top level: Reading (seed, 0), One (1), Two (2).
    const { items } = await firstValueFrom(
      folders.reorder({ parentId: null, ids: [two.id, MOCK_ID.FolderReading, one.id] }),
    );
    expect(items.filter((folder) => folder.parentId === null).map((folder) => folder.id)).toEqual([
      two.id,
      MOCK_ID.FolderReading,
      one.id,
    ]);
    expect(items.find((folder) => folder.id === one.id)?.updatedAt).toBe(one.updatedAt);
  });

  it('refuses an order that is not exactly the subfolders of that parent', async () => {
    const { folders } = create();
    const one = await firstValueFrom(folders.create({ name: 'One' }));
    for (const request of [
      { parentId: null, ids: [one.id] },
      { parentId: null, ids: [one.id, one.id] },
      { parentId: null, ids: [one.id, MOCK_ID.FolderReading, MOCK_ID.FolderAngular] },
      { parentId: 'missing', ids: [] },
    ]) {
      await expect(firstValueFrom(folders.reorder(request))).rejects.toThrow();
    }
  });

  it('puts a new folder and a moved folder at the end of the parent', async () => {
    const { folders } = create();
    const zed = await firstValueFrom(folders.create({ name: 'Zed' }));
    const alpha = await firstValueFrom(folders.create({ name: 'Alpha' }));
    expect(alpha.position).toBe(zed.position + 1);
    const moved = await firstValueFrom(folders.update(zed.id, { parentId: MOCK_ID.FolderReading }));
    const { items } = await firstValueFrom(folders.list());
    const inReading = items.filter((folder) => folder.parentId === MOCK_ID.FolderReading);
    expect(inReading.at(-1)?.id).toBe(moved.id);
  });
});
