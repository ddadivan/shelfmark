import {
  FOLDER_COLOUR,
  FOLDER_DELETE_MODE,
  FOLDER_ERROR_MESSAGE,
  FOLDER_ICON,
  FOLDER_LIMIT,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectedFolder } from '../support/expected-folder';
import { expectedLink } from '../support/expected-link';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';

export const FOLDERS_SCENARIOS: readonly ContractScenario[] = [
  scenario('folders', 'a new account has no folders and empty counts', async ({ folders }) => {
    expectEqual(await folders.list(), { items: [], counts: { all: 0, unsorted: 0, favorites: 0 } });
  }),

  scenario('folders', 'creates nested folders that list in order', async ({ folders }) => {
    const reading = await folders.create({ name: 'Reading' });
    const angular = await folders.create({ name: 'Angular', parentId: reading.id });
    const second = await folders.create({ name: 'Cooking' });
    expectEqual(reading, expectedFolder('Reading'));
    expectEqual(angular, expectedFolder('Angular', { parentId: reading.id }));
    expectEqual(second, expectedFolder('Cooking', { position: 1 }));
    const { items } = await folders.list();
    expectEqual(
      items.map((folder) => folder.name),
      ['Angular', 'Reading', 'Cooking'],
    );
  }),

  scenario('folders', 'counts the links directly inside a folder', async ({ folders, links }) => {
    const folder = await folders.create({ name: 'Reading' });
    await links.create({ url: 'https://a.example/', title: 'A', folderId: folder.id });
    await links.create({ url: 'https://b.example/', title: 'B' });
    const list = await folders.list();
    expectEqual(list.items, [expectedFolder('Reading', { id: folder.id, linkCount: 1 })]);
    expectEqual(list.counts, { all: 2, unsorted: 1, favorites: 0 });
  }),

  scenario('folders', 'renames, recolours and re-icons a folder', async ({ folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    const updated = await folders.update(folder.id, {
      name: 'Books',
      colour: FOLDER_COLOUR.Ocean,
      icon: FOLDER_ICON.Book,
    });
    expectEqual(
      updated,
      expectedFolder('Books', {
        id: folder.id,
        colour: FOLDER_COLOUR.Ocean,
        icon: FOLDER_ICON.Book,
      }),
    );
    const custom = await folders.update(folder.id, { colour: '#aa00ff', icon: '📚' });
    expectEqual(custom, expectedFolder('Books', { id: folder.id, colour: '#aa00ff', icon: '📚' }));
  }),

  scenario('folders', 'moves a folder to the end of its new parent', async ({ folders }) => {
    const a = await folders.create({ name: 'A' });
    const b = await folders.create({ name: 'B' });
    const child = await folders.create({ name: 'Child', parentId: a.id });
    const moved = await folders.update(b.id, { parentId: a.id });
    expectEqual(moved, expectedFolder('B', { id: b.id, parentId: a.id, position: 1 }));
    const toTop = await folders.update(child.id, { parentId: null });
    expectEqual(toTop, expectedFolder('Child', { id: child.id, position: 1 }));
  }),

  scenario('folders', 'reorders the subfolders of one parent', async ({ folders }) => {
    const a = await folders.create({ name: 'A' });
    const b = await folders.create({ name: 'B' });
    const c = await folders.create({ name: 'C' });
    const { items } = await folders.reorder({ parentId: null, ids: [c.id, a.id, b.id] });
    expectEqual(
      items.map((folder) => [folder.name, folder.position]),
      [
        ['C', 0],
        ['A', 1],
        ['B', 2],
      ],
    );
  }),

  scenario(
    'folders',
    'refuses an order that does not list every sibling once',
    async ({ folders }) => {
      const a = await folders.create({ name: 'A' });
      await folders.create({ name: 'B' });
      await expectError(
        folders.reorder({ parentId: null, ids: [a.id] }),
        { status: 400, code: FOLDER_ERROR_MESSAGE.OrderMismatch },
        'reorder with a missing id',
      );
      await expectError(
        folders.reorder({ parentId: null, ids: [a.id, a.id] }),
        { status: 400, code: FOLDER_ERROR_MESSAGE.OrderMismatch },
        'reorder with a repeated id',
      );
    },
  ),

  scenario(
    'folders',
    'refuses to move a folder into itself or a subfolder',
    async ({ folders }) => {
      const a = await folders.create({ name: 'A' });
      const b = await folders.create({ name: 'B', parentId: a.id });
      await expectError(
        folders.update(a.id, { parentId: a.id }),
        { status: 400, code: FOLDER_ERROR_MESSAGE.MoveIntoDescendant },
        'move into itself',
      );
      await expectError(
        folders.update(a.id, { parentId: b.id }),
        { status: 400, code: FOLDER_ERROR_MESSAGE.MoveIntoDescendant },
        'move into a subfolder',
      );
    },
  ),

  scenario('folders', 'answers 404 for a missing folder or parent', async ({ folders }) => {
    const notFound = { status: 404, code: FOLDER_ERROR_MESSAGE.NotFound };
    await expectError(folders.create({ name: 'X', parentId: MISSING_ID }), notFound, 'create');
    await expectError(folders.update(MISSING_ID, { name: 'X' }), notFound, 'update');
    await expectError(
      folders.remove(MISSING_ID, FOLDER_DELETE_MODE.DeleteLinks),
      notFound,
      'remove',
    );
    const folder = await folders.create({ name: 'A' });
    await expectError(folders.update(folder.id, { parentId: MISSING_ID }), notFound, 'move');
  }),

  scenario('folders', 'rejects an empty, too long or unknown field', async ({ folders }) => {
    await expectError(folders.create({ name: '' }), { status: 400 }, 'empty name');
    await expectError(
      folders.create({ name: 'x'.repeat(FOLDER_LIMIT.NameMax + 1) }),
      { status: 400 },
      'long name',
    );
    const folder = await folders.create({ name: 'A' });
    await expectError(
      folders.update(folder.id, { colour: 'not-a-colour' as never }),
      { status: 400 },
      'colour',
    );
    await expectError(folders.update(folder.id, { icon: 'ab' as never }), { status: 400 }, 'icon');
  }),

  scenario(
    'folders',
    'delete with move-to-unsorted keeps the links',
    async ({ folders, links, trash }) => {
      const parent = await folders.create({ name: 'Parent' });
      const child = await folders.create({ name: 'Child', parentId: parent.id });
      const inChild = await links.create({
        url: 'https://a.example/',
        title: 'A',
        folderId: child.id,
      });
      await folders.remove(parent.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      expectEqual(await folders.list(), {
        items: [],
        counts: { all: 1, unsorted: 1, favorites: 0 },
      });
      expectEqual(
        await links.get(inChild.id),
        expectedLink('https://a.example/', 'A', { id: inChild.id }),
      );
      const { items, total } = await trash.list();
      expectEqual(total, 1);
      expectEqual(items[0], {
        kind: 'folder',
        id: parent.id,
        title: 'Parent',
        url: null,
        faviconUrl: null,
        imageUrl: null,
        fromFolderName: null,
        linkCount: 0,
        deletedAt: ANY.time,
        expiresAt: ANY.time,
      });
    },
  ),

  scenario(
    'folders',
    'delete with delete-links moves the links to Trash with the folder',
    async ({ folders, links, trash }) => {
      const folder = await folders.create({ name: 'Reading' });
      const link = await links.create({
        url: 'https://a.example/',
        title: 'A',
        folderId: folder.id,
      });
      await folders.remove(folder.id, FOLDER_DELETE_MODE.DeleteLinks);
      expectEqual(await folders.list(), {
        items: [],
        counts: { all: 0, unsorted: 0, favorites: 0 },
      });
      await expectError(links.get(link.id), { status: 404 }, 'get a trashed link');
      const { items } = await trash.list();
      expectEqual(
        items.map((item) => [item.kind, item.title, item.linkCount]),
        [['folder', 'Reading', 1]],
      );
    },
  ),
];
