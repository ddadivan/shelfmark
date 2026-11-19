import { randomUUID } from 'node:crypto';
import {
  DEMO_LIMIT,
  FOLDER_LIMIT,
  IMPORT_ENDPOINT,
  IMPORT_ERROR_MESSAGE,
  IMPORT_SOURCE,
  LINK_BATCH_ERROR_CODE,
  type ImportCheckResponse,
  type ImportLinkItem,
  type ImportLinksResponse,
  type ListImportsResponse,
  type StartImportRequest,
  type StartImportResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInDemo } from '../../test-utils/sign-in-demo';

const BASE = IMPORT_ENDPOINT.Base;
const linksUrl = (id: string): string => `${BASE}/${id}${IMPORT_ENDPOINT.Links}`;
const finishUrl = (id: string): string => `${BASE}/${id}${IMPORT_ENDPOINT.Finish}`;

const item = (url: string, extra: Partial<ImportLinkItem> = {}): ImportLinkItem => ({
  url,
  idempotencyKey: randomUUID(),
  ...extra,
});

const startBody = (extra: Partial<StartImportRequest> = {}): StartImportRequest => ({
  source: IMPORT_SOURCE.Browser,
  fileName: 'bookmarks.html',
  folders: [],
  ...extra,
});

describe('imports API (#387)', () => {
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

  const start = async (body: StartImportRequest, agent = a): Promise<StartImportResponse> =>
    (await agent.post(BASE).send(body).expect(201)).body as StartImportResponse;

  const send = async (
    id: string,
    items: ImportLinkItem[],
    extra: object = {},
    agent = a,
  ): Promise<ImportLinksResponse> =>
    (
      await agent
        .post(linksUrl(id))
        .send({ items, ...extra })
        .expect(200)
    ).body as ImportLinksResponse;

  describe('start', () => {
    it('keeps the structure: nested folders below a new target, all marked with the import', async () => {
      const res = await start(
        startBody({
          newFolderName: 'Imported',
          folders: [
            { key: 'bar', parentKey: null, name: 'Bookmarks bar' },
            { key: 'dev', parentKey: 'bar', name: 'Dev' },
            { key: 'other', parentKey: null, name: 'Other' },
          ],
        }),
      );
      expect(res.targetFolderId).not.toBeNull();
      expect(res.folders.map((folder) => folder.key)).toEqual(['bar', 'dev', 'other']);
      const id = (key: string): string => res.folders.find((f) => f.key === key)?.id ?? '';

      const rows = await t.db.prisma.folder.findMany({ where: { userId: users.owner.userId } });
      const byId = new Map(rows.map((row) => [row.id, row]));
      expect(rows).toHaveLength(4);
      expect(rows.every((row) => row.importId === res.id)).toBe(true);
      expect(byId.get(res.targetFolderId ?? '')).toMatchObject({
        name: 'Imported',
        parentId: null,
      });
      expect(byId.get(id('bar'))?.parentId).toBe(res.targetFolderId);
      expect(byId.get(id('dev'))?.parentId).toBe(id('bar'));
      expect(byId.get(id('other'))?.parentId).toBe(res.targetFolderId);
      expect([id('bar'), id('other')].map((key) => byId.get(key)?.position)).toEqual([0, 1]);

      const record = await t.db.prisma.import.findFirstOrThrow({ where: { id: res.id } });
      expect(record).toMatchObject({
        userId: users.owner.userId,
        source: 'browser',
        fileName: 'bookmarks.html',
        foldersCreated: 4,
        targetFolderId: res.targetFolderId,
        linksCreated: 0,
        finishedAt: null,
        undoneAt: null,
      });
    });

    it('flattens: no folders, no target means Unsorted', async () => {
      const res = await start(startBody());
      expect(res).toMatchObject({ targetFolderId: null, folders: [] });
      expect(await t.db.prisma.folder.count()).toBe(0);
    });

    it('puts the file folders under an existing target, after its own subfolders', async () => {
      const target = (
        await t.db.prisma.folder.create({ data: { userId: users.owner.userId, name: 'Reading' } })
      ).id;
      await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name: 'Mine', parentId: target, position: 4 },
      });
      const res = await start(
        startBody({
          targetFolderId: target,
          folders: [{ key: 'a', parentKey: null, name: 'From file' }],
        }),
      );
      expect(res.targetFolderId).toBe(target);
      const created = await t.db.prisma.folder.findFirstOrThrow({
        where: { id: res.folders[0].id },
      });
      expect(created).toMatchObject({ parentId: target, position: 5, importId: res.id });
      // The existing target is not the import's.
      expect(
        (await t.db.prisma.folder.findFirstOrThrow({ where: { id: target } })).importId,
      ).toBeNull();
      expect(
        (await t.db.prisma.import.findFirstOrThrow({ where: { id: res.id } })).foldersCreated,
      ).toBe(1);
    });

    it('creates file folders at the top level when there is no target', async () => {
      const res = await start(startBody({ folders: [{ key: 'a', parentKey: null, name: 'Top' }] }));
      const row = await t.db.prisma.folder.findFirstOrThrow({ where: { id: res.folders[0].id } });
      expect(row.parentId).toBeNull();
    });

    it('refuses with 409 and writes nothing when the folders do not fit the cap', async () => {
      await t.db.prisma.folder.createMany({
        data: Array.from({ length: FOLDER_LIMIT.PerUserMax - 1 }, (_, i) => ({
          userId: users.owner.userId,
          name: `F${i}`,
        })),
      });
      const res = await a
        .post(BASE)
        .send(
          startBody({
            newFolderName: 'Imported',
            folders: [{ key: 'a', parentKey: null, name: 'A' }],
          }),
        )
        .expect(409);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.FoldersLimit);
      expect(await t.db.prisma.import.count()).toBe(0);
      expect(await t.db.prisma.folder.count()).toBe(FOLDER_LIMIT.PerUserMax - 1);
    });

    it('counts trashed folders against the cap', async () => {
      await t.db.prisma.folder.createMany({
        data: Array.from({ length: FOLDER_LIMIT.PerUserMax }, (_, i) => ({
          userId: users.owner.userId,
          name: `F${i}`,
          deletedAt: new Date(),
        })),
      });
      await a
        .post(BASE)
        .send(startBody({ folders: [{ key: 'a', parentKey: null, name: 'A' }] }))
        .expect(409);
    });

    it('refuses both a target folder and a new folder name', async () => {
      const res = await a
        .post(BASE)
        .send(startBody({ targetFolderId: randomUUID(), newFolderName: 'X' }))
        .expect(400);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.TargetBoth);
    });

    it.each([
      [
        'a duplicate key',
        [
          { key: 'a', parentKey: null, name: 'A' },
          { key: 'a', parentKey: null, name: 'B' },
        ],
      ],
      ['an unknown parent', [{ key: 'a', parentKey: 'nope', name: 'A' }]],
      [
        'a later parent',
        [
          { key: 'a', parentKey: 'b', name: 'A' },
          { key: 'b', parentKey: null, name: 'B' },
        ],
      ],
    ])('refuses %s with 400', async (_label, folders) => {
      const res = await a.post(BASE).send(startBody({ folders })).expect(400);
      expect(res.body.message).toBe(IMPORT_ERROR_MESSAGE.FolderKeys);
      expect(await t.db.prisma.import.count()).toBe(0);
    });

    it.each([
      ['an unknown source', { source: 'pocket' }],
      ['a blank file name', { fileName: '   ' }],
      [
        'a folder name with a control character',
        { folders: [{ key: 'a', parentKey: null, name: 'A\u0000' }] },
      ],
      ['a blank folder name', { folders: [{ key: 'a', parentKey: null, name: ' ' }] }],
      ['an extra field', { userId: randomUUID() }],
      ['a missing parentKey', { folders: [{ key: 'a', name: 'A' }] }],
    ])('refuses %s with 400', async (_label, extra) => {
      await a
        .post(BASE)
        .send({ ...startBody(), ...extra })
        .expect(400);
    });

    it('needs a session', async () => {
      await anonymous(t.app).post(BASE).send(startBody()).expect(401);
    });
  });

  describe('links', () => {
    it('saves a batch into the target folder with notes, dates, tags and import ids', async () => {
      const res = await start(
        startBody({
          newFolderName: 'Imported',
          folders: [{ key: 'dev', parentKey: null, name: 'Dev' }],
        }),
      );
      const dev = res.folders[0].id;
      await t.db.prisma.tag.create({ data: { userId: users.owner.userId, name: 'existing' } });
      const out = await send(res.id, [
        item('https://example.test/in-dev', {
          folderId: dev,
          note: 'a\nnote',
          addedAt: '2021-03-04T10:20:30Z',
        }),
        item('https://example.test/in-target', { title: 'Own title', tags: ['existing', 'Fresh'] }),
      ]);
      expect(out).toEqual({ created: 2, replayed: 0, errors: [] });

      const links = await t.db.prisma.link.findMany({
        where: { userId: users.owner.userId },
        include: { tags: { include: { tag: true } } },
      });
      const dated = links.find((link) => link.url.endsWith('in-dev'));
      const plain = links.find((link) => link.url.endsWith('in-target'));
      expect(dated).toMatchObject({
        folderId: dev,
        note: 'a\nnote',
        importId: res.id,
        titleSortKey: 'https://example.test/in-dev',
      });
      expect(dated?.createdAt.toISOString()).toBe('2021-03-04T10:20:30.000Z');
      expect(plain).toMatchObject({
        folderId: res.targetFolderId,
        title: 'Own title',
        importId: res.id,
      });
      expect(plain?.tags.map((row) => row.tag.name).sort()).toEqual(['Fresh', 'existing']);

      const tags = await t.db.prisma.tag.findMany({ where: { userId: users.owner.userId } });
      expect(Object.fromEntries(tags.map((tag) => [tag.name, tag.importId]))).toEqual({
        existing: null,
        Fresh: res.id,
      });
      expect(
        (await t.db.prisma.import.findFirstOrThrow({ where: { id: res.id } })).linksCreated,
      ).toBe(2);
    });

    it('sends links without a folder to Unsorted when the import has no target', async () => {
      const res = await start(startBody());
      await send(res.id, [item('https://example.test/a')]);
      const link = await t.db.prisma.link.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(link.folderId).toBeNull();
    });

    it('falls back to Unsorted when the target folder went to Trash meanwhile', async () => {
      const res = await start(startBody({ newFolderName: 'Imported' }));
      await t.db.prisma.folder.update({
        where: { id: res.targetFolderId ?? '' },
        data: { deletedAt: new Date() },
      });
      await send(res.id, [item('https://example.test/a')]);
      const link = await t.db.prisma.link.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(link.folderId).toBeNull();
    });

    it('clamps the date added: the future is now, before 1990 keeps the batch order', async () => {
      const res = await start(startBody());
      const before = Date.now();
      await send(res.id, [
        item('https://example.test/future', { addedAt: '2999-01-01T00:00:00Z' }),
        item('https://example.test/ancient', { addedAt: '1970-01-01T00:00:00Z' }),
      ]);
      const links = await t.db.prisma.link.findMany({ where: { userId: users.owner.userId } });
      for (const link of links) {
        expect(link.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
        expect(link.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });

    it('replays a retried batch: no copies, counted as replayed', async () => {
      const res = await start(startBody());
      const items = [item('https://example.test/a'), item('https://example.test/b')];
      expect(await send(res.id, items)).toEqual({ created: 2, replayed: 0, errors: [] });
      expect(await send(res.id, items)).toEqual({ created: 0, replayed: 2, errors: [] });
      expect(await t.db.prisma.link.count()).toBe(2);
      expect(
        (await t.db.prisma.import.findFirstOrThrow({ where: { id: res.id } })).linksCreated,
      ).toBe(2);
    });

    it('skips a URL repeated in the batch, or keeps it with skipRepeats false', async () => {
      const res = await start(startBody());
      const first = await send(res.id, [
        item('https://example.test/a'),
        item('https://example.test/a/'),
      ]);
      expect(first.created).toBe(1);
      expect(first.errors).toEqual([
        { index: 1, url: 'https://example.test/a/', code: LINK_BATCH_ERROR_CODE.DuplicateInBatch },
      ]);
      const second = await send(
        res.id,
        [item('https://example.test/b'), item('https://example.test/b')],
        { skipRepeats: false },
      );
      expect(second).toEqual({ created: 2, replayed: 0, errors: [] });
    });

    it('strips tracking parameters like a normal save', async () => {
      const res = await start(startBody());
      await send(res.id, [item('https://example.test/a?utm_source=x&id=1')]);
      const link = await t.db.prisma.link.findFirstOrThrow({
        where: { userId: users.owner.userId },
      });
      expect(link.url).toBe('https://example.test/a?id=1');
    });

    it('does not apply domain rules', async () => {
      const folder = await t.db.prisma.folder.create({
        data: { userId: users.owner.userId, name: 'Rule folder' },
      });
      await t.db.prisma.linkRule.create({
        data: { userId: users.owner.userId, domain: 'example.test', folderId: folder.id },
      });
      const res = await start(startBody());
      await send(res.id, [item('https://example.test/a')]);
      const link = await t.db.prisma.link.findFirstOrThrow({
        where: { userId: users.owner.userId, importId: res.id },
      });
      expect(link.folderId).toBeNull();
    });

    it('applies the demo link cap', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      const res = await start(startBody(), agent);
      const have = await t.db.prisma.link.count({ where: { userId: demo.userId } });
      const items = Array.from({ length: DEMO_LIMIT.MaxLinks - have + 1 }, (_, i) =>
        item(`https://demo.test/${i}`),
      );
      await agent.post(linksUrl(res.id)).send({ items }).expect(409);
    });

    it('is closed after 24 hours', async () => {
      const res = await start(startBody());
      await t.db.prisma.import.update({
        where: { id: res.id },
        data: { createdAt: new Date(Date.now() - 25 * 3_600_000) },
      });
      const out = await a
        .post(linksUrl(res.id))
        .send({ items: [item('https://example.test/a')] })
        .expect(409);
      expect(out.body.message).toBe(IMPORT_ERROR_MESSAGE.Closed);
    });

    it('refuses an unknown folder with 404 and writes nothing', async () => {
      const res = await start(startBody());
      await a
        .post(linksUrl(res.id))
        .send({ items: [item('https://example.test/a', { folderId: randomUUID() })] })
        .expect(404);
      expect(await t.db.prisma.link.count()).toBe(0);
    });

    it.each([
      ['a javascript URL', { url: 'javascript:alert(1)' }],
      ['a note with a control character', { note: 'x\u0000y' }],
      ['an addedAt without offset', { addedAt: '2021-03-04T10:20:30' }],
      ['an addedAt that is not a date', { addedAt: '2021-13-45T10:20:30Z' }],
      ['an idempotency key that is no UUID', { idempotencyKey: 'x' }],
    ])('refuses %s with 400', async (_label, extra) => {
      const res = await start(startBody());
      await a
        .post(linksUrl(res.id))
        .send({ items: [{ ...item('https://example.test/a'), ...extra }] })
        .expect(400);
    });

    it('refuses an empty batch', async () => {
      const res = await start(startBody());
      await a.post(linksUrl(res.id)).send({ items: [] }).expect(400);
    });
  });

  describe('check', () => {
    it('answers the indexes of saved links, normalised, without trashed links', async () => {
      await seedLink(t.db.prisma, users.owner.userId, { url: 'https://example.test/saved' });
      await seedLink(t.db.prisma, users.owner.userId, {
        url: 'https://example.test/with-param?id=1',
      });
      const trashed = await seedLink(t.db.prisma, users.owner.userId, {
        url: 'https://example.test/trashed',
      });
      await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
      const res = await a
        .post(IMPORT_ENDPOINT.Check)
        .send({
          urls: [
            'https://EXAMPLE.test/saved/',
            'https://example.test/new',
            'https://example.test/with-param?id=1&utm_source=news',
            'https://example.test/trashed',
            'https://example.test/saved',
          ],
        })
        .expect(200);
      expect((res.body as ImportCheckResponse).saved).toEqual([0, 2, 4]);
    });

    it('refuses empty lists, over-long lists and non-http URLs', async () => {
      await a.post(IMPORT_ENDPOINT.Check).send({ urls: [] }).expect(400);
      await a
        .post(IMPORT_ENDPOINT.Check)
        .send({ urls: Array.from({ length: 501 }, (_, i) => `https://example.test/${i}`) })
        .expect(400);
      await a
        .post(IMPORT_ENDPOINT.Check)
        .send({ urls: ['ftp://example.test/a'] })
        .expect(400);
    });

    it('writes nothing', async () => {
      await a
        .post(IMPORT_ENDPOINT.Check)
        .send({ urls: ['https://example.test/a'] })
        .expect(200);
      expect(await t.db.prisma.link.count()).toBe(0);
      expect(await t.db.prisma.import.count()).toBe(0);
    });
  });

  describe('finish and list', () => {
    it('stores the counts and the finish time', async () => {
      const res = await start(startBody());
      await a.post(finishUrl(res.id)).send({ skipped: 3, failed: 1 }).expect(204);
      await a.post(finishUrl(res.id)).send({ skipped: 5, failed: 0 }).expect(204);
      const row = await t.db.prisma.import.findFirstOrThrow({ where: { id: res.id } });
      expect(row).toMatchObject({ skipped: 5, failed: 0 });
      expect(row.finishedAt).not.toBeNull();
    });

    it('refuses negative or fractional counts', async () => {
      const res = await start(startBody());
      await a.post(finishUrl(res.id)).send({ skipped: -1, failed: 0 }).expect(400);
      await a.post(finishUrl(res.id)).send({ skipped: 0.5, failed: 0 }).expect(400);
      await a.post(finishUrl(res.id)).send({ skipped: 0, failed: 10_001 }).expect(400);
    });

    it('lists recent imports newest first, hides undone and older than 7 days', async () => {
      const first = await start(startBody({ fileName: 'one.html' }));
      const second = await start(startBody({ fileName: 'two.html', newFolderName: 'Two' }));
      const undone = await start(startBody({ fileName: 'undone.html' }));
      const old = await start(startBody({ fileName: 'old.html' }));
      await a.post(`${BASE}/${undone.id}${IMPORT_ENDPOINT.Undo}`).expect(200);
      await t.db.prisma.import.update({
        where: { id: old.id },
        data: { createdAt: new Date(Date.now() - 8 * 24 * 3_600_000) },
      });
      await t.db.prisma.import.update({
        where: { id: first.id },
        data: { createdAt: new Date(Date.now() - 3_600_000) },
      });
      await send(second.id, [item('https://example.test/a')]);

      const body = (await a.get(BASE).expect(200)).body as ListImportsResponse;
      expect(body.items.map((entry) => entry.fileName)).toEqual(['two.html', 'one.html']);
      expect(body.items[0]).toMatchObject({
        id: second.id,
        source: 'browser',
        targetFolderId: second.targetFolderId,
        linksCreated: 1,
        foldersCreated: 1,
        skipped: 0,
        failed: 0,
        finishedAt: null,
      });
    });

    it('answers targetFolderId only while that folder is live', async () => {
      const res = await start(startBody({ newFolderName: 'Two' }));
      await t.db.prisma.folder.update({
        where: { id: res.targetFolderId ?? '' },
        data: { deletedAt: new Date() },
      });
      const body = (await a.get(BASE).expect(200)).body as ListImportsResponse;
      expect(body.items[0].targetFolderId).toBeNull();
    });

    it('keeps only the most recent ten', async () => {
      await t.db.prisma.import.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
          userId: users.owner.userId,
          source: 'browser',
          fileName: `f${i}.html`,
        })),
      });
      const body = (await a.get(BASE).expect(200)).body as ListImportsResponse;
      expect(body.items).toHaveLength(10);
    });
  });

  it('is removed with the account (cascade)', async () => {
    const res = await start(startBody({ newFolderName: 'X' }));
    await send(res.id, [item('https://example.test/a', { tags: ['t'] })]);
    await t.db.prisma.user.delete({ where: { id: users.owner.userId } });
    expect(await t.db.prisma.import.count()).toBe(0);
    expect(await t.db.prisma.link.count({ where: { userId: users.owner.userId } })).toBe(0);
  });
});
