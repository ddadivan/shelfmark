import {
  SHARE_ERROR_MESSAGE,
  SHARE_LIMIT,
  SHARE_TOKEN_PATTERN,
  type FolderResponse,
} from '@shelfmark/contracts';
import type { ContractScenario } from '../models/contract-scenario.interface';
import { ANY } from '../support/any.const';
import { expectEqual } from '../support/expect-equal';
import { expectError } from '../support/expect-error';
import { scenario } from '../support/scenario';

const MISSING_ID = '018f0000-0000-7000-8000-00000000dead';
const OWNER_FIRST_NAME = 'Contract';

function disabled(folderId: string) {
  return { folderId, enabled: false, token: null, showNotes: false, createdAt: null };
}

function enabled(folderId: string, showNotes = false) {
  return {
    folderId,
    enabled: true,
    token: ANY.matching(SHARE_TOKEN_PATTERN),
    showNotes,
    createdAt: ANY.time,
  };
}

export const SHARES_SCENARIOS: readonly ContractScenario[] = [
  scenario('sharing', 'a folder is private until it is shared', async ({ shares, folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    expectEqual(await shares.get(folder.id), disabled(folder.id));
  }),

  scenario(
    'sharing',
    'enables sharing and keeps the same token when asked again',
    async ({ shares, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const first = await shares.enable(folder.id);
      expectEqual(first, enabled(folder.id));
      expectEqual(await shares.enable(folder.id), first);
      expectEqual(await shares.get(folder.id), first);
    },
  ),

  scenario('sharing', 'switches notes on and off', async ({ shares, folders }) => {
    const folder = await folders.create({ name: 'Reading' });
    await shares.enable(folder.id);
    expectEqual(await shares.setShowNotes(folder.id, true), { ...enabled(folder.id, true) });
    expectEqual((await shares.setShowNotes(folder.id, false)).showNotes, false);
  }),

  scenario(
    'sharing',
    'reset replaces the token and the old one stops working',
    async ({ shares, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const first = await shares.enable(folder.id);
      const second = await shares.reset(folder.id);
      expectEqual(second, enabled(folder.id));
      expectEqual(second.token === first.token, false);
      await expectError(
        shares.collection(first.token ?? ''),
        { status: 404, code: SHARE_ERROR_MESSAGE.NotFound },
        'old token',
      );
      expectEqual((await shares.collection(second.token ?? '')).name, 'Reading');
    },
  ),

  scenario(
    'sharing',
    'disable stops the public page and turns sharing off',
    async ({ shares, folders }) => {
      const folder = await folders.create({ name: 'Reading' });
      const on = await shares.enable(folder.id);
      await shares.disable(folder.id);
      expectEqual(await shares.get(folder.id), disabled(folder.id));
      await expectError(
        shares.collection(on.token ?? ''),
        { status: 404, code: SHARE_ERROR_MESSAGE.NotFound },
        'collection after disable',
      );
    },
  ),

  scenario(
    'sharing',
    'serves the public collection with subfolders, newest links first, and notes only when allowed',
    async ({ shares, folders, links }) => {
      const root: FolderResponse = await folders.create({ name: 'Reading' });
      const sub = await folders.create({ name: 'Angular', parentId: root.id });
      await links.create({
        url: 'https://a.example/',
        title: 'First',
        note: 'private note',
        folderId: root.id,
      });
      await links.create({ url: 'https://b.example/', title: 'Second', folderId: sub.id });
      await links.create({ url: 'https://c.example/', title: 'Outside' });
      const { token } = await shares.enable(root.id);
      const page = await shares.collection(token ?? '');
      expectEqual(page, {
        ownerName: OWNER_FIRST_NAME,
        name: 'Reading',
        linkCount: 2,
        updatedAt: ANY.time,
        subfolders: [{ id: sub.id, name: 'Angular', linkCount: 1 }],
        items: [
          {
            id: ANY.id,
            url: 'https://b.example/',
            title: 'Second',
            note: null,
            faviconUrl: null,
            imageUrl: null,
          },
          {
            id: ANY.id,
            url: 'https://a.example/',
            title: 'First',
            note: null,
            faviconUrl: null,
            imageUrl: null,
          },
        ],
        page: 1,
        hasMore: false,
      });
      await shares.setShowNotes(root.id, true);
      const withNotes = await shares.collection(token ?? '');
      expectEqual(
        withNotes.items.map((item) => item.note),
        [null, 'private note'],
      );
      const inSub = await shares.collection(token ?? '', { folder: sub.id });
      expectEqual(
        inSub.items.map((item) => item.title),
        ['Second'],
      );
      expectEqual(inSub.name, 'Reading');
    },
  ),

  scenario(
    'sharing',
    'answers the same 404 for an unknown token and a folder outside the subtree',
    async ({ shares, folders }) => {
      const shared = await folders.create({ name: 'Shared' });
      const other = await folders.create({ name: 'Other' });
      const { token } = await shares.enable(shared.id);
      const notFound = { status: 404, code: SHARE_ERROR_MESSAGE.NotFound };
      await expectError(
        shares.collection('A'.repeat(SHARE_LIMIT.TokenLength)),
        notFound,
        'unknown token',
      );
      await expectError(
        shares.collection(token ?? '', { folder: other.id }),
        notFound,
        'outside the subtree',
      );
    },
  ),

  scenario(
    'sharing',
    'answers 404 for a missing folder and for settings of a folder that is not shared',
    async ({ shares, folders }) => {
      await expectError(shares.get(MISSING_ID), { status: 404 }, 'get');
      await expectError(shares.enable(MISSING_ID), { status: 404 }, 'enable');
      await expectError(shares.disable(MISSING_ID), { status: 404 }, 'disable');
      const folder = await folders.create({ name: 'Private' });
      await expectError(
        shares.setShowNotes(folder.id, true),
        { status: 404 },
        'notes of a private folder',
      );
      await expectError(shares.reset(folder.id), { status: 404 }, 'reset of a private folder');
    },
  ),

  scenario('sharing', 'refuses the eleventh public folder', async ({ shares, folders }) => {
    for (let index = 0; index < SHARE_LIMIT.PerUserMax; index++) {
      const folder = await folders.create({ name: `F${index}` });
      await shares.enable(folder.id);
    }
    const extra = await folders.create({ name: 'Extra' });
    await expectError(
      shares.enable(extra.id),
      { status: 409, code: SHARE_ERROR_MESSAGE.LimitReached },
      'enable past the limit',
    );
  }),
];
