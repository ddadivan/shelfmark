import {
  LINK_KIND,
  LINK_SORT_FIELD,
  SAVED_VIEW_ERROR_MESSAGE,
  SAVED_VIEW_LIMIT,
  SAVED_VIEW_SCOPE,
  SORT_ORDER,
  FOLDER_DELETE_MODE,
  type SavedViewQuery,
  type SavedViewResponse,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';

function query(fields: Partial<SavedViewQuery> = {}): SavedViewQuery {
  return {
    scope: SAVED_VIEW_SCOPE.All,
    folderId: null,
    tags: [],
    kind: null,
    sort: LINK_SORT_FIELD.CreatedAt,
    order: SORT_ORDER.Desc,
    q: '',
    ...fields,
  };
}

function view(
  name: string,
  position: number,
  count: number,
  fields: Partial<SavedViewResponse> = {},
) {
  return { id: ANY.id, name, query: query(), position, count, available: true, ...fields };
}

const starterViews = [
  view('Videos', 0, 0, { query: query({ kind: LINK_KIND.Video }) }),
  view('Articles', 1, 0, { query: query({ kind: LINK_KIND.Article }) }),
];

export const VIEWS_SCENARIOS: readonly ContractScenario[] = [
  scenario(
    'views',
    'a new account starts with the Videos and Articles views',
    async ({ views }) => {
      expectEqual(await views.list(), { total: 0, items: starterViews });
    },
  ),

  scenario(
    'views',
    'counts the links each view matches and the total',
    async ({ views, links }) => {
      await links.create({ url: 'https://www.youtube.com/watch?v=1', title: 'Clip' });
      await links.create({ url: 'https://a.example/', title: 'Plain' });
      await links.create({ url: 'https://b.example/', title: 'Article', kind: LINK_KIND.Article });
      const list = await views.list();
      expectEqual(list.total, 3);
      expectEqual(
        list.items.map((item) => [item.name, item.count]),
        [
          ['Videos', 1],
          ['Articles', 1],
        ],
      );
    },
  ),

  scenario(
    'views',
    'saves views with each scope and trims the name',
    async ({ views, folders, links }) => {
      const folder = await folders.create({ name: 'Reading' });
      await links.create({ url: 'https://a.example/', title: 'Loose' });
      const favorite = await links.create({
        url: 'https://b.example/',
        title: 'Fav',
        folderId: folder.id,
      });
      await links.update(favorite.id, { isFavorite: true });

      const unsorted = await views.create({
        name: '  Loose ones ',
        query: { scope: SAVED_VIEW_SCOPE.Unsorted },
      });
      expectEqual(
        unsorted,
        view('Loose ones', 2, 1, { query: query({ scope: SAVED_VIEW_SCOPE.Unsorted }) }),
      );
      const favorites = await views.create({
        name: 'Starred',
        query: {
          scope: SAVED_VIEW_SCOPE.Favorites,
          sort: LINK_SORT_FIELD.Title,
          order: SORT_ORDER.Asc,
        },
      });
      expectEqual(
        favorites,
        view('Starred', 3, 1, {
          query: query({
            scope: SAVED_VIEW_SCOPE.Favorites,
            sort: LINK_SORT_FIELD.Title,
            order: SORT_ORDER.Asc,
          }),
        }),
      );
      const inFolder = await views.create({
        name: 'Reading list',
        query: { scope: SAVED_VIEW_SCOPE.Folder, folderId: folder.id, tags: ['dev'], q: 'fav' },
      });
      expectEqual(
        inFolder,
        view('Reading list', 4, 0, {
          query: query({
            scope: SAVED_VIEW_SCOPE.Folder,
            folderId: folder.id,
            tags: ['dev'],
            q: 'fav',
          }),
        }),
      );
    },
  ),

  scenario('views', 'renames a view, changes its query and keeps the rest', async ({ views }) => {
    const created = await views.create({
      name: 'Mine',
      query: { scope: SAVED_VIEW_SCOPE.All, q: 'x' },
    });
    const renamed = await views.update(created.id, { name: 'Yours' });
    expectEqual(renamed, view('Yours', 2, 0, { id: created.id, query: query({ q: 'x' }) }));
    const changed = await views.update(created.id, {
      query: { scope: SAVED_VIEW_SCOPE.Favorites },
    });
    expectEqual(
      changed,
      view('Yours', 2, 0, { id: created.id, query: query({ scope: SAVED_VIEW_SCOPE.Favorites }) }),
    );
  }),

  scenario('views', 'removes a view', async ({ views }) => {
    const created = await views.create({ name: 'Temp', query: { scope: SAVED_VIEW_SCOPE.All } });
    await views.remove(created.id);
    expectEqual(
      (await views.list()).items.map((item) => item.name),
      ['Videos', 'Articles'],
    );
  }),

  scenario(
    'views',
    'reorders the views and refuses a list that is not exactly the views',
    async ({ views }) => {
      const { items } = await views.list();
      const ids = items.map((item) => item.id);
      const reordered = await views.reorder([ids[1], ids[0]]);
      expectEqual(
        reordered.items.map((item) => [item.name, item.position]),
        [
          ['Articles', 0],
          ['Videos', 1],
        ],
      );
      const mismatch = { status: 400, code: SAVED_VIEW_ERROR_MESSAGE.OrderMismatch };
      await expectError(views.reorder([ids[0]]), mismatch, 'missing view');
      await expectError(views.reorder([ids[0], ids[0]]), mismatch, 'repeated view');
    },
  ),

  scenario('views', 'counts inside a feed when one is given', async ({ views, folders, links }) => {
    const folder = await folders.create({ name: 'Reading' });
    await links.create({
      url: 'https://www.youtube.com/watch?v=1',
      title: 'Clip',
      folderId: folder.id,
    });
    await links.create({ url: 'https://www.youtube.com/watch?v=2', title: 'Clip 2' });
    const inFolder = await views.list({ scope: SAVED_VIEW_SCOPE.Folder, folderId: folder.id });
    expectEqual(inFolder.total, 1);
    expectEqual(
      inFolder.items.map((item) => [item.name, item.count]),
      [
        ['Videos', 1],
        ['Articles', 0],
      ],
    );
    const unsorted = await views.list({ scope: SAVED_VIEW_SCOPE.Unsorted });
    expectEqual(unsorted.total, 1);
    await expectError(
      views.list({ scope: SAVED_VIEW_SCOPE.Folder }),
      { status: 400, code: SAVED_VIEW_ERROR_MESSAGE.FeedFolderRequired },
      'folder feed without folderId',
    );
  }),

  scenario(
    'views',
    'marks a view unavailable once its folder is in the Trash',
    async ({ views, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      await views.create({
        name: 'Reading list',
        query: { scope: SAVED_VIEW_SCOPE.Folder, folderId: folder.id },
      });
      await folders.remove(folder.id, FOLDER_DELETE_MODE.MoveToUnsorted);
      const gone = (await views.list()).items.find((item) => item.name === 'Reading list');
      expectEqual(gone?.available, false);
      expectEqual(gone?.count, 0);
    },
  ),

  scenario(
    'views',
    'refuses an empty or too long name and a folder view without a live folder',
    async ({ views, folders }) => {
      await expectError(
        views.create({ name: '   ', query: { scope: SAVED_VIEW_SCOPE.All } }),
        { status: 400 },
        'blank name',
      );
      await expectError(
        views.create({
          name: 'x'.repeat(SAVED_VIEW_LIMIT.NameMax + 1),
          query: { scope: SAVED_VIEW_SCOPE.All },
        }),
        { status: 400 },
        'long name',
      );
      await expectError(
        views.create({ name: 'F', query: { scope: SAVED_VIEW_SCOPE.Folder } }),
        { status: 400, code: SAVED_VIEW_ERROR_MESSAGE.FolderRequired },
        'folder view without folderId',
      );
      const folder = await folders.create({ name: 'Reading' });
      await expectError(
        views.create({ name: 'F', query: { scope: SAVED_VIEW_SCOPE.All, folderId: folder.id } }),
        { status: 400, code: SAVED_VIEW_ERROR_MESSAGE.FolderNotAllowed },
        'folderId on another scope',
      );
      await expectError(
        views.create({
          name: 'F',
          query: { scope: SAVED_VIEW_SCOPE.Folder, folderId: MISSING_ID },
        }),
        { status: 404, code: SAVED_VIEW_ERROR_MESSAGE.FolderNotFound },
        'missing folder',
      );
    },
  ),

  scenario('views', 'answers 404 for a missing view', async ({ views }) => {
    const notFound = { status: 404, code: SAVED_VIEW_ERROR_MESSAGE.NotFound };
    await expectError(views.update(MISSING_ID, { name: 'x' }), notFound, 'update');
    await expectError(views.remove(MISSING_ID), notFound, 'remove');
  }),

  scenario('views', 'refuses the twenty-first view', async ({ views }) => {
    const free = SAVED_VIEW_LIMIT.PerUserMax - (await views.list()).items.length;
    for (let index = 0; index < free; index++) {
      await views.create({ name: `View ${index}`, query: { scope: SAVED_VIEW_SCOPE.All } });
    }
    await expectError(
      views.create({ name: 'One too many', query: { scope: SAVED_VIEW_SCOPE.All } }),
      { status: 409, code: SAVED_VIEW_ERROR_MESSAGE.LimitReached },
      'create past the limit',
    );
  }),
];
