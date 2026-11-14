import {
  FOLDER_DELETE_MODE,
  TRASH_ITEM_KIND,
  TRASH_LIMIT,
  type TrashItem,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectedFolder } from '../support/expected-folder';
import { expectedLink } from '../support/expected-link';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';
const DAY_MS = 86_400_000;

export const TRASH_SCENARIOS: readonly ContractScenario[] = [
  scenario(
    'trash',
    'a new account has an empty Trash with the default retention',
    async ({ trash }) => {
      expectEqual(await trash.list(), { items: [], total: 0, retentionDays: 30 });
    },
  ),

  scenario(
    'trash',
    'lists a deleted link with where it came from and when it expires',
    async ({ trash, links, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const link = await links.create({
        url: 'https://a.example/',
        title: 'A',
        folderId: folder.id,
      });
      await links.remove(link.id);
      const { items, total, retentionDays } = await trash.list();
      expectEqual(total, 1);
      expectEqual(retentionDays, 30);
      expectEqual(items, [
        {
          kind: TRASH_ITEM_KIND.Link,
          id: link.id,
          title: 'A',
          url: 'https://a.example/',
          faviconUrl: null,
          imageUrl: null,
          fromFolderName: 'Reading',
          linkCount: null,
          deletedAt: ANY.time,
          expiresAt: ANY.time,
        },
      ]);
      expectEqual(Date.parse(items[0].expiresAt) - Date.parse(items[0].deletedAt), 30 * DAY_MS);
    },
  ),

  scenario('trash', 'lists the newest deletion first', async ({ trash, links }) => {
    const a = await links.create({ url: 'https://a.example/', title: 'A' });
    const b = await links.create({ url: 'https://b.example/', title: 'B' });
    await links.remove(a.id);
    await links.remove(b.id);
    expectEqual(
      (await trash.list()).items.map((item: TrashItem) => item.title),
      ['B', 'A'],
    );
  }),

  scenario(
    'trash',
    'restores a link into its folder, or into Unsorted when the folder is gone',
    async ({ trash, links, folders }) => {
      const keep = await folders.create({ name: 'Keep' });
      const lose = await folders.create({ name: 'Lose' });
      const a = await links.create({ url: 'https://a.example/', title: 'A', folderId: keep.id });
      const b = await links.create({ url: 'https://b.example/', title: 'B', folderId: lose.id });
      await links.remove(a.id);
      await links.remove(b.id);
      await folders.remove(lose.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      const restored = await trash.restore([
        { kind: TRASH_ITEM_KIND.Link, id: a.id },
        { kind: TRASH_ITEM_KIND.Link, id: b.id },
      ]);
      expectEqual(restored, { count: 2 });
      expectEqual(
        await links.get(a.id),
        expectedLink('https://a.example/', 'A', { id: a.id, folderId: keep.id }),
      );
      expectEqual((await links.get(b.id)).folderId, null);
      expectEqual(
        (await trash.list()).items.map((item) => item.kind),
        [TRASH_ITEM_KIND.Folder],
      );
    },
  ),

  scenario(
    'trash',
    'restores a folder with its subfolders and the links deleted with it',
    async ({ trash, links, folders }) => {
      const parent = await folders.create({ name: 'Parent' });
      const child = await folders.create({ name: 'Child', parentId: parent.id });
      const inChild = await links.create({
        url: 'https://a.example/',
        title: 'A',
        folderId: child.id,
      });
      await folders.remove(parent.id, FOLDER_DELETE_MODE.DeleteLinks);
      expectEqual(
        (await trash.list()).items.map((item) => [item.title, item.linkCount]),
        [['Parent', 1]],
      );
      expectEqual(await trash.restore([{ kind: TRASH_ITEM_KIND.Folder, id: parent.id }]), {
        count: 1,
      });
      const list = await folders.list();
      expectEqual(list.items, [
        expectedFolder('Child', { id: child.id, parentId: parent.id, linkCount: 1 }),
        expectedFolder('Parent', { id: parent.id, linkCount: 0 }),
      ]);
      expectEqual((await links.get(inChild.id)).folderId, child.id);
      expectEqual((await trash.list()).total, 0);
    },
  ),

  scenario(
    'trash',
    'deletes items for good and counts only the ones it found',
    async ({ trash, links }) => {
      const a = await links.create({ url: 'https://a.example/', title: 'A' });
      const b = await links.create({ url: 'https://b.example/', title: 'B' });
      await links.remove(a.id);
      await links.remove(b.id);
      const done = await trash.deleteForever([
        { kind: TRASH_ITEM_KIND.Link, id: a.id },
        { kind: TRASH_ITEM_KIND.Link, id: MISSING_ID },
      ]);
      expectEqual(done, { count: 1 });
      expectEqual(
        (await trash.list()).items.map((item) => item.title),
        ['B'],
      );
      expectEqual(await trash.restore([{ kind: TRASH_ITEM_KIND.Link, id: a.id }]), { count: 0 });
      await expectError(links.get(a.id), { status: 404 }, 'a link deleted for good');
    },
  ),

  scenario('trash', 'empties the Trash', async ({ trash, links }) => {
    const a = await links.create({ url: 'https://a.example/', title: 'A' });
    const b = await links.create({ url: 'https://b.example/', title: 'B' });
    await links.removeBatch([a.id, b.id]);
    expectEqual(await trash.empty(), { count: 2 });
    expectEqual(await trash.list(), { items: [], total: 0, retentionDays: 30 });
    expectEqual(await trash.empty(), { count: 0 });
  }),

  scenario('trash', 'rejects an empty or oversized item list', async ({ trash }) => {
    await expectError(trash.restore([]), { status: 400 }, 'restore nothing');
    await expectError(trash.deleteForever([]), { status: 400 }, 'delete nothing');
    const tooMany = Array.from({ length: TRASH_LIMIT.BatchMax + 1 }, () => ({
      kind: TRASH_ITEM_KIND.Link,
      id: MISSING_ID,
    }));
    await expectError(trash.restore(tooMany), { status: 400 }, 'restore too many');
  }),
];
