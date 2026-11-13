import {
  FOLDER_ERROR_MESSAGE,
  LINK_ERROR_MESSAGE,
  LINK_KIND,
  LINK_LIMIT,
  LINK_SORT_FIELD,
  LINKS_BATCH_ERROR_MESSAGE,
  PAGE_LIMIT,
  SORT_ORDER,
  type LinkResponse,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectedLink } from '../support/expected-link';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';
const URL_A = 'https://a.example/';
const URL_B = 'https://b.example/';
const URL_C = 'https://c.example/';

function titles(links: readonly LinkResponse[]): string[] {
  return links.map((link) => link.title);
}

export const LINKS_SCENARIOS: readonly ContractScenario[] = [
  scenario(
    'links',
    'saves a link with its title, note, folder, tags and kind',
    async ({ links, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const link = await links.create({
        url: URL_A,
        title: 'Alpha',
        note: 'why I saved it',
        folderId: folder.id,
        tags: ['news', 'dev'],
        kind: LINK_KIND.Article,
      });
      // The API lists a link's tags by name.
      expectEqual(
        link,
        expectedLink(URL_A, 'Alpha', {
          note: 'why I saved it',
          folderId: folder.id,
          tags: ['dev', 'news'],
          kind: LINK_KIND.Article,
        }),
      );
      expectEqual(await links.get(link.id), link);
    },
  ),

  scenario(
    'links',
    'normalises tag names, drops repeats and lists them by name',
    async ({ links }) => {
      const link = await links.create({
        url: URL_A,
        title: 'Alpha',
        tags: ['Deep Dive', 'zeta', 'deep dive', 'Alpha'],
      });
      expectEqual(link.tags, ['Alpha', 'Deep-Dive', 'zeta']);
    },
  ),

  scenario('links', 'strips tracking parameters from the saved URL', async ({ links }) => {
    const link = await links.create({
      url: 'https://a.example/page?utm_source=news&id=7&fbclid=x',
      title: 'Alpha',
    });
    expectEqual(link.url, 'https://a.example/page?id=7');
  }),

  scenario(
    'links',
    'saves the same key once and answers the first link again',
    async ({ links }) => {
      const key = '018f0000-0000-7000-8000-0000000000a1';
      const first = await links.create({ url: URL_A, title: 'Alpha', idempotencyKey: key });
      const replay = await links.create({ url: URL_A, title: 'Alpha', idempotencyKey: key });
      expectEqual(replay, first);
      expectEqual((await links.list()).items.length, 1);
    },
  ),

  scenario(
    'links',
    'rejects a URL that is not http(s), too long fields and too many tags',
    async ({ links }) => {
      await expectError(
        links.create({ url: 'javascript:alert(1)', title: 'x' }),
        { status: 400 },
        'javascript: URL',
      );
      await expectError(
        links.create({ url: 'data:text/html,hi', title: 'x' }),
        { status: 400 },
        'data: URL',
      );
      await expectError(links.create({ url: 'not a url', title: 'x' }), { status: 400 }, 'no URL');
      await expectError(
        links.create({ url: URL_A, title: 'x'.repeat(LINK_LIMIT.TitleMax + 1) }),
        { status: 400 },
        'long title',
      );
      await expectError(
        links.create({ url: URL_A, title: 'x', note: 'x'.repeat(LINK_LIMIT.NoteMax + 1) }),
        { status: 400 },
        'long note',
      );
      await expectError(
        links.create({
          url: URL_A,
          title: 'x',
          tags: Array.from({ length: LINK_LIMIT.TagsMax + 1 }, (_, index) => `tag${index}`),
        }),
        { status: 400 },
        'too many tags',
      );
    },
  ),

  scenario('links', 'answers 404 for a missing folder on save', async ({ links }) => {
    await expectError(
      links.create({ url: URL_A, title: 'x', folderId: MISSING_ID }),
      { status: 404, code: FOLDER_ERROR_MESSAGE.NotFound },
      'create into a missing folder',
    );
  }),

  scenario(
    'links',
    'lists the newest link first, with the pinned list empty',
    async ({ links }) => {
      await links.create({ url: URL_A, title: 'Alpha' });
      await links.create({ url: URL_B, title: 'Beta' });
      await links.create({ url: URL_C, title: 'Gamma' });
      const page = await links.list();
      expectEqual(titles(page.items), ['Gamma', 'Beta', 'Alpha']);
      expectEqual(page.nextCursor, null);
      expectEqual(page.pinned, []);
      expectEqual(titles((await links.list({ order: SORT_ORDER.Asc })).items), [
        'Alpha',
        'Beta',
        'Gamma',
      ]);
      expectEqual(
        titles((await links.list({ sort: LINK_SORT_FIELD.Title, order: SORT_ORDER.Asc })).items),
        ['Alpha', 'Beta', 'Gamma'],
      );
    },
  ),

  scenario('links', 'pages through the list with the cursor', async ({ links }) => {
    for (const title of ['One', 'Two', 'Three', 'Four', 'Five']) {
      await links.create({ url: `https://${title.toLowerCase()}.example/`, title });
    }
    const first = await links.list({ limit: 2 });
    expectEqual(titles(first.items), ['Five', 'Four']);
    expectEqual(typeof first.nextCursor, 'string');
    const second = await links.list({ limit: 2, cursor: first.nextCursor ?? '' });
    expectEqual(titles(second.items), ['Three', 'Two']);
    const third = await links.list({ limit: 2, cursor: second.nextCursor ?? '' });
    expectEqual(titles(third.items), ['One']);
    expectEqual(third.nextCursor, null);
  }),

  scenario(
    'links',
    'rejects a broken cursor, an oversized limit and clashing filters',
    async ({ links, folders }) => {
      await expectError(
        links.list({ cursor: 'not-a-cursor' }),
        { status: 400, code: LINK_ERROR_MESSAGE.InvalidCursor },
        'broken cursor',
      );
      await expectError(
        links.list({ limit: PAGE_LIMIT.Max + 1 }),
        { status: 400 },
        'limit too big',
      );
      await expectError(links.list({ limit: 0 }), { status: 400 }, 'limit zero');
      const folder = await folders.create({ name: 'F' });
      await expectError(
        links.list({ folderId: folder.id, unsorted: true }),
        { status: 400, code: LINK_ERROR_MESSAGE.FolderAndUnsorted },
        'folder and unsorted',
      );
    },
  ),

  scenario(
    'links',
    'filters by folder, unsorted, favorite, tags, kind and search text',
    async ({ links, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const a = await links.create({
        url: URL_A,
        title: 'Angular guide',
        folderId: folder.id,
        tags: ['dev', 'ng'],
      });
      await links.create({
        url: URL_B,
        title: 'Pasta recipe',
        tags: ['food'],
        note: 'Angular is not food',
      });
      await links.create({
        url: 'https://www.youtube.com/watch?v=1',
        title: 'A video',
        tags: ['dev'],
      });
      await links.update(a.id, { isFavorite: true });

      expectEqual(titles((await links.list({ folderId: folder.id })).items), ['Angular guide']);
      expectEqual(titles((await links.list({ unsorted: true })).items), [
        'A video',
        'Pasta recipe',
      ]);
      expectEqual(titles((await links.list({ favorite: true })).items), ['Angular guide']);
      expectEqual(titles((await links.list({ tag: ['DEV'] })).items), ['A video', 'Angular guide']);
      expectEqual(titles((await links.list({ tag: ['dev', 'ng'] })).items), ['Angular guide']);
      expectEqual(titles((await links.list({ kind: LINK_KIND.Video })).items), ['A video']);
      expectEqual(titles((await links.list({ q: 'angular' })).items), [
        'Pasta recipe',
        'Angular guide',
      ]);
      expectEqual(titles((await links.list({ q: 'angular pasta' })).items), ['Pasta recipe']);
      expectEqual(titles((await links.list({ q: 'b.example' })).items), ['Pasta recipe']);
    },
  ),

  scenario('links', 'updates fields and keeps the rest', async ({ links, folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    const link = await links.create({ url: URL_A, title: 'Alpha', tags: ['one'] });
    const updated = await links.update(link.id, {
      title: 'Alpha 2',
      note: 'n',
      isFavorite: true,
      folderId: folder.id,
      tags: ['two', 'three'],
    });
    expectEqual(
      updated,
      expectedLink(URL_A, 'Alpha 2', {
        id: link.id,
        note: 'n',
        isFavorite: true,
        folderId: folder.id,
        tags: ['three', 'two'],
      }),
    );
    const cleared = await links.update(link.id, { note: null, folderId: null });
    expectEqual(cleared.note, null);
    expectEqual(cleared.folderId, null);
    expectEqual(cleared.title, 'Alpha 2');
  }),

  scenario('links', 'takes the kind of the new host when the URL changes', async ({ links }) => {
    const link = await links.create({ url: URL_A, title: 'Alpha' });
    expectEqual(link.kind, LINK_KIND.Other);
    const moved = await links.update(link.id, { url: 'https://www.youtube.com/watch?v=1' });
    expectEqual(moved.kind, LINK_KIND.Video);
    const set = await links.update(link.id, { kind: LINK_KIND.Article });
    expectEqual(set.kind, LINK_KIND.Article);
  }),

  scenario(
    'links',
    'pins a link to the top of its folder, up to the limit',
    async ({ links, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const loose = await links.create({ url: URL_A, title: 'Loose' });
      await expectError(
        links.update(loose.id, { pinnedInFolder: true }),
        { status: 400, code: LINK_ERROR_MESSAGE.PinNeedsFolder },
        'pin outside a folder',
      );
      const inFolder: LinkResponse[] = [];
      for (let index = 0; index < LINK_LIMIT.PinnedInFolderMax + 1; index++) {
        inFolder.push(
          await links.create({
            url: `https://${index}.example/`,
            title: `L${index}`,
            folderId: folder.id,
          }),
        );
      }
      const pinned = await links.update(inFolder[0].id, { pinnedInFolder: true });
      expectEqual(pinned.pinnedInFolderAt, ANY.time);
      const page = await links.list({ folderId: folder.id });
      expectEqual(titles(page.pinned), ['L0']);
      expectEqual(page.items.length, LINK_LIMIT.PinnedInFolderMax);
      for (let index = 1; index < LINK_LIMIT.PinnedInFolderMax; index++) {
        await links.update(inFolder[index].id, { pinnedInFolder: true });
      }
      await expectError(
        links.update(inFolder[LINK_LIMIT.PinnedInFolderMax].id, { pinnedInFolder: true }),
        { status: 409, code: LINK_ERROR_MESSAGE.PinnedInFolderLimit },
        'pin past the limit',
      );
      const unpinned = await links.update(inFolder[0].id, { pinnedInFolder: false });
      expectEqual(unpinned.pinnedInFolderAt, null);
    },
  ),

  scenario('links', 'answers 404 for a missing link', async ({ links }) => {
    const notFound = { status: 404, code: LINK_ERROR_MESSAGE.NotFound };
    await expectError(links.get(MISSING_ID), notFound, 'get');
    await expectError(links.update(MISSING_ID, { title: 'x' }), notFound, 'update');
    await expectError(links.remove(MISSING_ID), notFound, 'remove');
    await expectError(links.open(MISSING_ID), notFound, 'open');
    await expectError(links.removeRecent(MISSING_ID), notFound, 'remove from history');
  }),

  scenario(
    'links',
    'opens a link, lists it as recent and clears the history',
    async ({ links }) => {
      const a = await links.create({ url: URL_A, title: 'Alpha' });
      const b = await links.create({ url: URL_B, title: 'Beta' });
      expectEqual((await links.recent()).items, []);
      const opened = await links.open(a.id);
      expectEqual(opened, {
        ...expectedLink(URL_A, 'Alpha', { id: a.id, lastOpenedAt: ANY.time }),
        recorded: true,
      });
      await links.open(b.id);
      await links.open(a.id);
      expectEqual(titles((await links.recent()).items), ['Alpha', 'Beta']);
      expectEqual(titles((await links.recent({ limit: 1 })).items), ['Alpha']);
      await links.removeRecent(a.id);
      // Removing it again, or a link that was never opened, is fine.
      await links.removeRecent(a.id);
      expectEqual(titles((await links.recent()).items), ['Beta']);
      expectEqual((await links.get(a.id)).lastOpenedAt, null);
      await links.clearRecent();
      expectEqual((await links.recent()).items, []);
      expectEqual((await links.list()).items.length, 2);
    },
  ),

  scenario('links', 'removes a link into the Trash', async ({ links, trash }) => {
    const link = await links.create({ url: URL_A, title: 'Alpha' });
    await links.remove(link.id);
    await expectError(links.get(link.id), { status: 404 }, 'get after remove');
    expectEqual((await links.list()).items, []);
    const { items, total } = await trash.list();
    expectEqual(total, 1);
    expectEqual(
      items.map((item) => [item.kind, item.id, item.title]),
      [['link', link.id, 'Alpha']],
    );
  }),

  scenario(
    'links',
    'saves several links at once, skipping a repeated URL',
    async ({ links, folders }) => {
      const folder = await folders.create({ name: 'Paste' });
      const response = await links.createBatch({
        folderId: folder.id,
        tags: ['paste'],
        items: [
          { url: URL_A, title: 'Alpha', idempotencyKey: '018f0000-0000-7000-8000-0000000000b1' },
          { url: URL_B, idempotencyKey: '018f0000-0000-7000-8000-0000000000b2' },
          { url: URL_A, idempotencyKey: '018f0000-0000-7000-8000-0000000000b3' },
        ],
      });
      expectEqual(
        response.links.map((link) => [link.url, link.folderId === folder.id, link.tags]),
        [
          [URL_A, true, ['paste']],
          [URL_B, true, ['paste']],
        ],
      );
      expectEqual(
        response.errors.map(({ index, code }) => [index, code]),
        [[2, 'duplicate-in-batch']],
      );
      const replay = await links.createBatch({
        folderId: folder.id,
        tags: ['paste'],
        items: [
          { url: URL_A, title: 'Alpha', idempotencyKey: '018f0000-0000-7000-8000-0000000000b1' },
        ],
      });
      expectEqual(
        replay.links.map((link) => link.id),
        [response.links[0].id],
      );
      expectEqual((await links.list()).items.length, 2);
    },
  ),

  scenario(
    'links',
    'rejects a batch with a URL that is too long or not http(s)',
    async ({ links }) => {
      const key = '018f0000-0000-7000-8000-0000000000b5';
      await expectError(
        links.createBatch({
          items: [
            { url: `https://long.example/${'x'.repeat(LINK_LIMIT.UrlMax)}`, idempotencyKey: key },
          ],
        }),
        { status: 400 },
        'long URL',
      );
      await expectError(
        links.createBatch({ items: [{ url: 'javascript:alert(1)', idempotencyKey: key }] }),
        { status: 400 },
        'javascript: URL',
      );
      await expectError(links.createBatch({ items: [] }), { status: 400 }, 'no items');
    },
  ),

  scenario(
    'links',
    'moves several links to the Trash and counts only the live ones',
    async ({ links }) => {
      const a = await links.create({ url: URL_A, title: 'Alpha' });
      const b = await links.create({ url: URL_B, title: 'Beta' });
      await links.create({ url: URL_C, title: 'Gamma' });
      expectEqual(await links.removeBatch([a.id, b.id, MISSING_ID]), { deleted: 2 });
      expectEqual(titles((await links.list()).items), ['Gamma']);
      expectEqual(await links.removeBatch([a.id]), { deleted: 0 });
    },
  ),

  scenario(
    'links',
    'changes folder, tags and favorite of several links in one go',
    async ({ links, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const a = await links.create({ url: URL_A, title: 'Alpha', tags: ['old', 'keep'] });
      const b = await links.create({ url: URL_B, title: 'Beta' });
      const response = await links.updateBatch({
        ids: [a.id, b.id, MISSING_ID],
        folderId: folder.id,
        addTags: ['new'],
        removeTags: ['OLD'],
        isFavorite: true,
      });
      expectEqual(response.updated, 2);
      expectEqual(
        response.links.map((link) => [
          link.title,
          link.folderId === folder.id,
          link.tags,
          link.isFavorite,
        ]),
        [
          ['Alpha', true, ['keep', 'new'], true],
          ['Beta', true, ['new'], true],
        ],
      );
      await expectError(
        links.updateBatch({ ids: [a.id], folderId: MISSING_ID }),
        { status: 404, code: FOLDER_ERROR_MESSAGE.NotFound },
        'batch move into a missing folder',
      );
      await expectError(
        links.updateBatch({ ids: [a.id] }),
        { status: 400, code: LINKS_BATCH_ERROR_MESSAGE.NothingToChange },
        'batch update with no change',
      );
      await expectError(
        links.updateBatch({ ids: [a.id], addTags: ['x'], removeTags: ['X'] }),
        { status: 400, code: LINKS_BATCH_ERROR_MESSAGE.TagAddedAndRemoved },
        'batch update adding and removing a tag',
      );
    },
  ),
];
