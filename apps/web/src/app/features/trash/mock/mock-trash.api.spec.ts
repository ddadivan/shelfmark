import { Injector, runInInjectionContext } from '@angular/core';
import { FOLDER_DELETE_MODE, TRASH_ITEM_KIND, TRASH_LIMIT } from '@shelfmark/contracts';
import { MOCK_ID } from '@shelfmark/contracts/testing';
import { firstValueFrom } from 'rxjs';
import { MockUserSettingsApi } from '../../settings/mock/mock-user-settings.api';
import { MockFoldersApi } from '../../links/mock/mock-folders.api';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockLinksApi } from '../../links/mock/mock-links.api';
import { MockTrashApi } from './mock-trash.api';

function create() {
  const injector = Injector.create({ providers: [MockLibraryData] });
  return runInInjectionContext(injector, () => ({
    trash: new MockTrashApi(),
    links: new MockLinksApi(),
    folders: new MockFoldersApi(),
    settings: new MockUserSettingsApi(),
    data: injector.get(MockLibraryData),
  }));
}

describe('MockTrashApi', () => {
  it('starts empty with the default retention', async () => {
    const { trash } = create();

    expect(await firstValueFrom(trash.list())).toEqual({ items: [], total: 0, retentionDays: 30 });
  });

  it('shows a deleted link with its folder and the expiry from the retention', async () => {
    const { trash, links, data } = create();
    const link = data.links.find((item) => item.folderId === MOCK_ID.FolderReading);
    if (!link) {
      throw new Error('fixture has no link in a folder');
    }

    await firstValueFrom(links.remove(link.id));
    const { items, total } = await firstValueFrom(trash.list());

    expect(total).toBe(1);
    expect(items[0]).toMatchObject({
      kind: TRASH_ITEM_KIND.Link,
      id: link.id,
      title: link.title,
      url: link.url,
      fromFolderName: data.folderName(MOCK_ID.FolderReading),
      linkCount: null,
    });
    expect(Date.parse(items[0].expiresAt) - Date.parse(items[0].deletedAt)).toBe(30 * 86_400_000);
    expect(data.links.some((item) => item.id === link.id)).toBe(false);
  });

  it('shows a folder deleted with its links as one entry with the link count', async () => {
    const { trash, folders, data } = create();
    // Links of the folder and of its subfolders go into the one entry.
    const tree = new Set(data.subtreeIds(MOCK_ID.FolderReading));
    const inside = data.links.filter(
      (link) => link.folderId !== null && tree.has(link.folderId),
    ).length;

    await firstValueFrom(folders.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.DeleteLinks));
    const { items, total } = await firstValueFrom(trash.list());

    expect(total).toBe(1);
    expect(items[0]).toMatchObject({
      kind: TRASH_ITEM_KIND.Folder,
      id: MOCK_ID.FolderReading,
      url: null,
      linkCount: inside,
    });
  });

  it('moves the links to Unsorted when the folder goes with move-to-unsorted (no link in Trash)', async () => {
    const { trash, folders } = create();

    await firstValueFrom(folders.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.MoveToUnsorted));
    const { items } = await firstValueFrom(trash.list());

    expect(items).toHaveLength(1);
    expect(items[0].linkCount).toBe(0);
  });

  it('restores a link to its folder, or to Unsorted when the folder is gone', async () => {
    const { trash, links, folders, data } = create();
    const [first, second] = data.links.filter((link) => link.folderId === MOCK_ID.FolderReading);
    await firstValueFrom(links.remove(first.id));
    await firstValueFrom(links.remove(second.id));
    await firstValueFrom(folders.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.MoveToUnsorted));

    const result = await firstValueFrom(
      trash.restore([{ kind: TRASH_ITEM_KIND.Link, id: first.id }]),
    );

    expect(result.count).toBe(1);
    expect(data.links.find((link) => link.id === first.id)?.folderId).toBeNull();
    const { items } = await firstValueFrom(trash.list());
    expect(items.map((item) => item.id)).not.toContain(first.id);
  });

  it('restores a folder with its subfolders and links', async () => {
    const { trash, folders, data } = create();
    const before = { links: data.links.length, folders: data.folderList.length };
    await firstValueFrom(folders.remove(MOCK_ID.FolderReading, FOLDER_DELETE_MODE.DeleteLinks));
    expect(data.links.length).toBeLessThan(before.links);

    const result = await firstValueFrom(
      trash.restore([{ kind: TRASH_ITEM_KIND.Folder, id: MOCK_ID.FolderReading }]),
    );

    expect(result.count).toBe(1);
    expect(data.links).toHaveLength(before.links);
    expect(data.folderList).toHaveLength(before.folders);
    expect((await firstValueFrom(trash.list())).total).toBe(0);
  });

  it('deletes entries for good and ignores unknown ones', async () => {
    const { trash, links, data } = create();
    const link = data.links[0];
    await firstValueFrom(links.remove(link.id));

    const result = await firstValueFrom(
      trash.deleteForever([
        { kind: TRASH_ITEM_KIND.Link, id: link.id },
        { kind: TRASH_ITEM_KIND.Link, id: 'nope' },
      ]),
    );

    expect(result.count).toBe(1);
    expect((await firstValueFrom(trash.list())).total).toBe(0);
    expect(data.links.some((item) => item.id === link.id)).toBe(false);
  });

  it('empties everything', async () => {
    const { trash, links, data } = create();
    await firstValueFrom(links.remove(data.links[0].id));
    await firstValueFrom(links.remove(data.links[0].id));

    expect(await firstValueFrom(trash.empty())).toEqual({ count: 2 });
    expect((await firstValueFrom(trash.list())).total).toBe(0);
  });

  it('refuses a batch above the limit', async () => {
    const { trash } = create();
    const refs = Array.from({ length: TRASH_LIMIT.BatchMax + 1 }, (_, i) => ({
      kind: TRASH_ITEM_KIND.Link,
      id: `x${i}`,
    }));

    expect(await firstValueFrom(trash.restore(refs))).toEqual({ count: 0 });
  });

  it('follows the retention setting in the days left', async () => {
    const { trash, links, settings, data } = create();
    await firstValueFrom(links.remove(data.links[0].id));

    await firstValueFrom(settings.update({ trashRetentionDays: 7 }));
    const { items, retentionDays } = await firstValueFrom(trash.list());

    expect(retentionDays).toBe(7);
    expect(Date.parse(items[0].expiresAt) - Date.parse(items[0].deletedAt)).toBe(7 * 86_400_000);
  });
});
