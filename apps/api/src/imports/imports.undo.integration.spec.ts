import { randomUUID } from 'node:crypto';
import {
  IMPORT_ENDPOINT,
  IMPORT_ERROR_MESSAGE,
  IMPORT_SOURCE,
  TRASH_ENDPOINT,
  TRASH_ITEM_KIND,
  type ImportLinkItem,
  type ListTrashResponse,
  type StartImportResponse,
  type UndoImportResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const BASE = IMPORT_ENDPOINT.Base;
const undoUrl = (id: string): string => `${BASE}/${id}${IMPORT_ENDPOINT.Undo}`;
const linksUrl = (id: string): string => `${BASE}/${id}${IMPORT_ENDPOINT.Links}`;
const item = (url: string, extra: Partial<ImportLinkItem> = {}): ImportLinkItem => ({
  url,
  idempotencyKey: randomUUID(),
  ...extra,
});

describe('imports API: undo (#387)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  /** A kept-structure import (Imported > Bar > Dev) with a link in each folder, plus the user's own additions. */
  const scenario = async () => {
    const userId = users.owner.userId;
    const started = (
      await a
        .post(BASE)
        .send({
          source: IMPORT_SOURCE.Browser,
          fileName: 'bookmarks.html',
          newFolderName: 'Imported',
          folders: [
            { key: 'bar', parentKey: null, name: 'Bar' },
            { key: 'dev', parentKey: 'bar', name: 'Dev' },
          ],
        })
        .expect(201)
    ).body as StartImportResponse;
    const [bar, dev] = started.folders.map((folder) => folder.id);
    const target = started.targetFolderId ?? '';
    await a
      .post(linksUrl(started.id))
      .send({
        items: [
          item('https://example.test/in-target'),
          item('https://example.test/in-bar', { folderId: bar, tags: ['shared', 'only-import'] }),
          item('https://example.test/in-dev', { folderId: dev, tags: ['only-import'] }),
        ],
      })
      .expect(200);
    // The user's own work after the import.
    const ownLink = await seedLink(t.db.prisma, userId, {
      url: 'https://example.test/mine',
      folderId: dev,
    });
    await t.db.prisma.link.update({
      where: { id: ownLink },
      data: { pinnedInFolderAt: new Date() },
    });
    const ownFolder = (
      await t.db.prisma.folder.create({ data: { userId, name: 'Mine', parentId: bar } })
    ).id;
    const inOwnFolder = await seedLink(t.db.prisma, userId, {
      url: 'https://example.test/mine-nested',
      folderId: ownFolder,
    });
    const elsewhere = await seedLink(t.db.prisma, userId, {
      url: 'https://example.test/elsewhere',
      tags: ['shared', 'old'],
    });
    const trashedElsewhere = await seedLink(t.db.prisma, userId, {
      url: 'https://example.test/gone',
      tags: ['trashed-carrier'],
    });
    await t.db.prisma.link.update({
      where: { id: trashedElsewhere },
      data: { deletedAt: new Date() },
    });
    return { started, bar, dev, target, ownLink, ownFolder, inOwnFolder, elsewhere };
  };

  it('moves exactly what the import created to Trash with one shared deleted_at', async () => {
    const s = await scenario();
    const userId = users.owner.userId;
    // A tag the import created but a trashed link outside the import also carries.
    const trashedCarrier = await t.db.prisma.link.findFirstOrThrow({
      where: { userId, url: 'https://example.test/gone' },
    });
    const carried = await t.db.prisma.tag.create({
      data: { userId, name: 'carried', importId: s.started.id },
    });
    await t.db.prisma.linkTag.create({ data: { linkId: trashedCarrier.id, tagId: carried.id } });

    const res = await a.post(undoUrl(s.started.id)).expect(200);
    expect(res.body as UndoImportResponse).toEqual({ links: 3, folders: 3, tags: 1 });

    const imported = await t.db.prisma.link.findMany({ where: { userId, importId: s.started.id } });
    const folders = await t.db.prisma.folder.findMany({
      where: { userId, importId: s.started.id },
    });
    const stamps = new Set(
      [...imported, ...folders].map((row) => row.deletedAt?.toISOString() ?? 'live'),
    );
    expect(stamps.size).toBe(1);
    expect(stamps.has('live')).toBe(false);

    // The user's own link in an import folder is in Unsorted and live, unpinned in the folder.
    expect(await t.db.prisma.link.findFirstOrThrow({ where: { id: s.ownLink } })).toMatchObject({
      folderId: null,
      deletedAt: null,
      pinnedInFolderAt: null,
    });
    // The user's subfolder moved to the top level and kept its link, all live.
    expect(await t.db.prisma.folder.findFirstOrThrow({ where: { id: s.ownFolder } })).toMatchObject(
      {
        parentId: null,
        deletedAt: null,
      },
    );
    expect(await t.db.prisma.link.findFirstOrThrow({ where: { id: s.inOwnFolder } })).toMatchObject(
      { folderId: s.ownFolder, deletedAt: null },
    );

    // Tags: only-import is gone, shared (on another link), old (not the import's) and carried (on a
    // trashed link outside the import) stay.
    const names = (await t.db.prisma.tag.findMany({ where: { userId } })).map((tag) => tag.name);
    expect(names.sort()).toEqual(['carried', 'old', 'shared', 'trashed-carrier']);
    expect((await t.db.prisma.linkTag.findMany({ where: { linkId: s.elsewhere } })).length).toBe(2);

    const record = await t.db.prisma.import.findFirstOrThrow({ where: { id: s.started.id } });
    expect(record.undoneAt).not.toBeNull();
  });

  it('shows the top folder as one Trash entry and restoring it brings the subtree back', async () => {
    const s = await scenario();
    await a.post(undoUrl(s.started.id)).expect(200);

    const trash = (await a.get(TRASH_ENDPOINT.Base).expect(200)).body as ListTrashResponse;
    const entries = trash.items.filter((entry) => entry.url === null || entry.title !== 'gone');
    const folderEntries = trash.items.filter((entry) => entry.kind === TRASH_ITEM_KIND.Folder);
    expect(folderEntries.map((entry) => [entry.id, entry.title, entry.linkCount])).toEqual([
      [s.target, 'Imported', 3],
    ]);
    // The only other entry is the link the user trashed earlier, not an import link.
    expect(entries.filter((entry) => entry.kind === TRASH_ITEM_KIND.Link)).toHaveLength(1);

    await a
      .post(TRASH_ENDPOINT.Restore)
      .send({ items: [{ kind: TRASH_ITEM_KIND.Folder, id: s.target }] })
      .expect(200);
    const live = await t.db.prisma.folder.findMany({
      where: { userId: users.owner.userId, importId: s.started.id, deletedAt: null },
    });
    expect(live).toHaveLength(3);
    expect(
      await t.db.prisma.link.count({
        where: { userId: users.owner.userId, importId: s.started.id, deletedAt: null },
      }),
    ).toBe(3);
  });

  it('is gone after the first Undo, and batches are closed afterwards', async () => {
    const s = await scenario();
    await a.post(undoUrl(s.started.id)).expect(200);
    const second = await a.post(undoUrl(s.started.id)).expect(409);
    expect(second.body.message).toBe(IMPORT_ERROR_MESSAGE.UndoGone);
    const batch = await a
      .post(linksUrl(s.started.id))
      .send({ items: [item('https://example.test/late')] })
      .expect(409);
    expect(batch.body.message).toBe(IMPORT_ERROR_MESSAGE.Closed);
    expect(await t.db.prisma.link.count({ where: { url: 'https://example.test/late' } })).toBe(0);
  });

  it('cannot be undone after seven days', async () => {
    const s = await scenario();
    await t.db.prisma.import.update({
      where: { id: s.started.id },
      data: { createdAt: new Date(Date.now() - 8 * 24 * 3_600_000) },
    });
    const res = await a.post(undoUrl(s.started.id)).expect(409);
    expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.UndoGone);
    expect(await t.db.prisma.link.count({ where: { deletedAt: { not: null } } })).toBe(1);
  });

  it('undoes an import into an existing folder: links go to Trash, the folder stays', async () => {
    const userId = users.owner.userId;
    const existing = (await t.db.prisma.folder.create({ data: { userId, name: 'Reading' } })).id;
    const started = (
      await a
        .post(BASE)
        .send({
          source: IMPORT_SOURCE.Browser,
          fileName: 'b.html',
          targetFolderId: existing,
          folders: [],
        })
        .expect(201)
    ).body as StartImportResponse;
    await a
      .post(linksUrl(started.id))
      .send({ items: [item('https://example.test/a')] })
      .expect(200);
    const res = await a.post(undoUrl(started.id)).expect(200);
    expect(res.body).toEqual({ links: 1, folders: 0, tags: 0 });
    expect(await t.db.prisma.folder.findFirstOrThrow({ where: { id: existing } })).toMatchObject({
      deletedAt: null,
    });
    const trash = (await a.get(TRASH_ENDPOINT.Base).expect(200)).body as ListTrashResponse;
    expect(trash.items.map((entry) => entry.kind)).toEqual([TRASH_ITEM_KIND.Link]);
  });

  it('leaves the library of another user untouched', async () => {
    const s = await scenario();
    const other = await seedLink(t.db.prisma, users.intruder.userId);
    await a.post(undoUrl(s.started.id)).expect(200);
    expect(
      (await t.db.prisma.link.findFirstOrThrow({ where: { id: other } })).deletedAt,
    ).toBeNull();
  });
});
