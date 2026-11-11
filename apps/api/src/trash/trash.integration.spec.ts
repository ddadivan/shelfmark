import {
  FOLDER_DELETE_MODE,
  TRASH_ENDPOINT,
  TRASH_ITEM_KIND,
  TRASH_LIMIT,
  type FolderDeleteMode,
  type FolderResponse,
  type ListFoldersResponse,
  type ListTrashResponse,
  type TrashActionResponse,
  type TrashItem,
  type TrashItemKind,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { randomUuidV7 } from '../../test-utils/isolation/random-uuid-v7';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const FOLDERS = '/api/folders';
const LINKS = '/api/links';
const DAY_MS = 24 * 60 * 60 * 1000;
const SHA = 'a'.repeat(64);

describe('trash API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const ownerId = (): string => users.owner.userId;

  async function folder(name: string, parentId?: string, agent: TestAgent = a): Promise<string> {
    const res = await agent.post(FOLDERS).send({ name, parentId }).expect(201);
    return (res.body as FolderResponse).id;
  }

  const link = (folderId?: string, title?: string): Promise<string> =>
    seedLink(t.db.prisma, ownerId(), { folderId, title });

  const trash = async (agent: TestAgent = a): Promise<ListTrashResponse> =>
    (await agent.get(TRASH_ENDPOINT.Base).expect(200)).body as ListTrashResponse;

  const removeFolder = (id: string, mode: FolderDeleteMode = FOLDER_DELETE_MODE.DeleteLinks) =>
    a.delete(`${FOLDERS}/${id}?mode=${mode}`).expect(204);

  const act = async (
    path: string,
    kind: TrashItemKind,
    id: string,
    agent: TestAgent = a,
  ): Promise<TrashActionResponse> =>
    (
      await agent
        .post(path)
        .send({ items: [{ kind, id }] })
        .expect(200)
    ).body as TrashActionResponse;

  const restore = (kind: TrashItemKind, id: string, agent?: TestAgent) =>
    act(TRASH_ENDPOINT.Restore, kind, id, agent);
  const purge = (kind: TrashItemKind, id: string, agent?: TestAgent) =>
    act(TRASH_ENDPOINT.Delete, kind, id, agent);

  const linkRow = (id: string) => t.db.prisma.link.findUniqueOrThrow({ where: { id } });
  const folderRow = (id: string) => t.db.prisma.folder.findUniqueOrThrow({ where: { id } });
  const entry = (list: ListTrashResponse, id: string): TrashItem | undefined =>
    list.items.find((item) => item.id === id);

  describe('GET /api/trash', () => {
    it('is empty for a new account and reports the default retention', async () => {
      expect(await trash()).toEqual({ items: [], total: 0, retentionDays: 30 });
    });

    it('lists a link deleted on its own with title, url, folder name and expiry', async () => {
      const parent = await folder('Reading');
      const id = await link(parent, 'Deep read');
      await a.delete(`${LINKS}/${id}`).expect(204);

      const list = await trash();
      expect(list.total).toBe(1);
      const item = entry(list, id);
      expect(item).toMatchObject({
        kind: TRASH_ITEM_KIND.Link,
        title: 'Deep read',
        fromFolderName: 'Reading',
        linkCount: null,
        faviconUrl: null,
      });
      expect(item?.url).toMatch(/^https:\/\/example\.test\//);
      const deletedAt = Date.parse(item?.deletedAt ?? '');
      expect(Date.parse(item?.expiresAt ?? '') - deletedAt).toBe(30 * DAY_MS);
    });

    it('carries same-origin image paths like a link response', async () => {
      const id = await link();
      await t.db.prisma.linkImage.create({
        data: {
          userId: ownerId(),
          linkId: id,
          kind: 'favicon',
          contentType: 'image/webp',
          bytes: Buffer.from('x'),
          width: 1,
          height: 1,
          sha256: SHA,
        },
      });
      await t.db.prisma.link.update({ where: { id }, data: { captureAttemptedAt: null } });
      await a.delete(`${LINKS}/${id}`).expect(204);

      const item = entry(await trash(), id);
      expect(item?.faviconUrl).toBe(`/api/links/${id}/favicon?v=${SHA.slice(0, 16)}`);
      expect(item?.imageUrl).toBe(`/api/links/${id}/image?v=pending`);
      // The image routes still serve a trashed link to its owner, and only to the owner.
      await a.get(`${LINKS}/${id}/favicon`).expect(200);
      await b.get(`${LINKS}/${id}/favicon`).expect(404);
    });

    it('shows a deleted folder as one entry for its whole subtree', async () => {
      const root = await folder('Old courses');
      const child = await folder('Week 1', root);
      const grand = await folder('Notes', child);
      const inRoot = await link(root);
      const inChild = await link(child);
      const inGrand = await link(grand);
      await removeFolder(root);

      const list = await trash();
      expect(list.total).toBe(1);
      expect(list.items).toHaveLength(1);
      expect(list.items[0]).toMatchObject({
        kind: TRASH_ITEM_KIND.Folder,
        id: root,
        title: 'Old courses',
        linkCount: 3,
        fromFolderName: null,
        url: null,
        imageUrl: null,
      });
      // One shared timestamp on the whole subtree.
      const stamps = await Promise.all(
        [root, child, grand].map(async (id) => (await folderRow(id)).deletedAt?.getTime()),
      );
      const linkStamps = await Promise.all(
        [inRoot, inChild, inGrand].map(async (id) => (await linkRow(id)).deletedAt?.getTime()),
      );
      expect(new Set([...stamps, ...linkStamps]).size).toBe(1);
      expect(stamps[0]).toBeTypeOf('number');
    });

    it('keeps a link deleted on its own before its folder as its own entry', async () => {
      const root = await folder('Project');
      const early = await link(root, 'Early');
      const late = await link(root, 'Late');
      await a.delete(`${LINKS}/${early}`).expect(204);
      await removeFolder(root);

      const list = await trash();
      expect(list.total).toBe(2);
      expect(entry(list, root)).toMatchObject({ kind: TRASH_ITEM_KIND.Folder, linkCount: 1 });
      expect(entry(list, early)).toMatchObject({
        kind: TRASH_ITEM_KIND.Link,
        fromFolderName: 'Project',
      });
      expect(entry(list, late)).toBeUndefined();
    });

    it('names the parent of a nested folder deleted on its own, and none for a gone parent', async () => {
      const root = await folder('Root');
      const child = await folder('Child', root);
      await removeFolder(child);
      expect(entry(await trash(), child)?.fromFolderName).toBe('Root');

      await removeFolder(root);
      // The child keeps being its own entry (deleted at another time) and still names its parent.
      const list = await trash();
      expect(list.total).toBe(2);
      expect(entry(list, child)?.fromFolderName).toBe('Root');
      expect(entry(list, root)?.fromFolderName).toBeNull();
    });

    it('lists newest first and at most ListMax, with the full total', async () => {
      const base = Date.now() - 10 * DAY_MS;
      await t.db.prisma.link.createMany({
        data: Array.from({ length: TRASH_LIMIT.ListMax + 3 }, (_, i) => ({
          userId: ownerId(),
          url: `https://bulk.test/${i}`,
          normalizedUrl: `https://bulk.test/${i}`,
          title: `t${i}`,
          titleSortKey: `t${i}`,
          deletedAt: new Date(base + i * 1000),
        })),
      });
      const list = await trash();
      expect(list.items).toHaveLength(TRASH_LIMIT.ListMax);
      expect(list.total).toBe(TRASH_LIMIT.ListMax + 3);
      expect(list.items[0]?.title).toBe(`t${TRASH_LIMIT.ListMax + 2}`);
      const times = list.items.map((item) => Date.parse(item.deletedAt));
      expect([...times].sort((x, y) => y - x)).toEqual(times);
    }, 30_000);

    it('uses the retention of the account for expiresAt', async () => {
      await t.db.prisma.user.update({ where: { id: ownerId() }, data: { trashRetentionDays: 7 } });
      const id = await link();
      await a.delete(`${LINKS}/${id}`).expect(204);
      const list = await trash();
      expect(list.retentionDays).toBe(7);
      const item = entry(list, id);
      expect(Date.parse(item?.expiresAt ?? '') - Date.parse(item?.deletedAt ?? '')).toBe(
        7 * DAY_MS,
      );
    });
  });

  describe('delete (soft)', () => {
    it('keeps the row, tags and updatedAt of a deleted link', async () => {
      const id = await seedLink(t.db.prisma, ownerId(), { tags: ['x'] });
      const before = await linkRow(id);
      await a.delete(`${LINKS}/${id}`).expect(204);
      const after = await linkRow(id);
      expect(after.deletedAt).not.toBeNull();
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(await t.db.prisma.linkTag.count()).toBe(1);
      await a.delete(`${LINKS}/${id}`).expect(404);
    });

    it('delete-links trashes the live links of the subtree, move-to-unsorted frees them', async () => {
      const keep = await folder('Keep');
      const gone = await folder('Gone');
      const sub = await folder('Sub', gone);
      const kept = await link(keep);
      const inGone = await link(gone);
      const inSub = await link(sub);

      await removeFolder(gone, FOLDER_DELETE_MODE.DeleteLinks);
      expect((await linkRow(inGone)).deletedAt).not.toBeNull();
      expect((await linkRow(inSub)).deletedAt).not.toBeNull();
      expect((await linkRow(kept)).deletedAt).toBeNull();

      const other = await folder('Other');
      const sub2 = await folder('Sub2', other);
      const free1 = await link(other);
      const free2 = await link(sub2);
      await removeFolder(other, FOLDER_DELETE_MODE.MoveToUnsorted);
      for (const id of [free1, free2]) {
        const row = await linkRow(id);
        expect(row.deletedAt).toBeNull();
        expect(row.folderId).toBeNull();
      }
      const list = await trash();
      expect(list.items.map((item) => item.id).sort()).toEqual([gone, other].sort());
      expect(entry(list, other)).toMatchObject({ linkCount: 0 });
    });

    it('404s for a folder already in Trash', async () => {
      const id = await folder('Once');
      await removeFolder(id);
      await a.delete(`${FOLDERS}/${id}?mode=${FOLDER_DELETE_MODE.DeleteLinks}`).expect(404);
    });

    it('does not accept a trashed folder as a parent or target', async () => {
      const gone = await folder('Gone');
      const live = await folder('Live');
      await removeFolder(gone);
      await a.post(FOLDERS).send({ name: 'Child', parentId: gone }).expect(404);
      await a.patch(`${FOLDERS}/${live}`).send({ parentId: gone }).expect(404);
      await a
        .post(LINKS)
        .send({ url: 'https://site.test/', title: 't', folderId: gone })
        .expect(404);
      const id = await link();
      await a.patch(`${LINKS}/${id}`).send({ folderId: gone }).expect(404);
      await a.patch(`${FOLDERS}/${gone}`).send({ name: 'x' }).expect(404);
      await a.get(`${FOLDERS}/${gone}`).expect(404);
    });
  });

  describe('restore', () => {
    it('puts a link back into its live folder', async () => {
      const parent = await folder('Home');
      const id = await link(parent);
      await a.delete(`${LINKS}/${id}`).expect(204);
      expect(await restore(TRASH_ITEM_KIND.Link, id)).toEqual({ count: 1 });
      const row = await linkRow(id);
      expect(row.deletedAt).toBeNull();
      expect(row.folderId).toBe(parent);
      expect((await trash()).total).toBe(0);
      await a.get(`${LINKS}/${id}`).expect(200);
    });

    it('puts a link into Unsorted when its folder is in Trash', async () => {
      const parent = await folder('Home');
      const id = await link(parent);
      await a.delete(`${LINKS}/${id}`).expect(204);
      await removeFolder(parent);
      expect(await restore(TRASH_ITEM_KIND.Link, id)).toEqual({ count: 1 });
      const row = await linkRow(id);
      expect(row.deletedAt).toBeNull();
      expect(row.folderId).toBeNull();
      // The folder is still in Trash on its own.
      expect((await trash()).items.map((item) => item.id)).toEqual([parent]);
    });

    it('puts a link into Unsorted when its folder was deleted for good', async () => {
      const parent = await folder('Home');
      const id = await link(parent);
      await a.delete(`${LINKS}/${id}`).expect(204);
      await removeFolder(parent);
      await purge(TRASH_ITEM_KIND.Folder, parent);
      // SET NULL: the link lost its folder and is a plain entry.
      expect(entry(await trash(), id)?.fromFolderName).toBeNull();
      await restore(TRASH_ITEM_KIND.Link, id);
      expect((await linkRow(id)).folderId).toBeNull();
    });

    it('brings back a folder with its subfolders and the links deleted with it only', async () => {
      const root = await folder('Root');
      const child = await folder('Child', root);
      const early = await link(root, 'Early');
      const inChild = await link(child);
      await a.delete(`${LINKS}/${early}`).expect(204);
      await removeFolder(root);

      expect(await restore(TRASH_ITEM_KIND.Folder, root)).toEqual({ count: 1 });
      expect((await folderRow(root)).deletedAt).toBeNull();
      expect((await folderRow(child)).deletedAt).toBeNull();
      expect((await linkRow(inChild)).deletedAt).toBeNull();
      expect((await linkRow(inChild)).folderId).toBe(child);
      // The link deleted on its own stays in Trash, now with a live folder.
      expect((await linkRow(early)).deletedAt).not.toBeNull();
      expect(entry(await trash(), early)?.fromFolderName).toBe('Root');
      const folders = (await a.get(FOLDERS).expect(200)).body as ListFoldersResponse;
      expect(folders.items.map((f) => f.id).sort()).toEqual([root, child].sort());
      expect(folders.counts.all).toBe(1);
    });

    it('puts a folder at the top level when its parent is not live', async () => {
      const root = await folder('Root');
      const child = await folder('Child', root);
      await removeFolder(child);
      await removeFolder(root);
      expect(await restore(TRASH_ITEM_KIND.Folder, child)).toEqual({ count: 1 });
      const row = await folderRow(child);
      expect(row.deletedAt).toBeNull();
      expect(row.parentId).toBeNull();
      expect((await folderRow(root)).deletedAt).not.toBeNull();
    });

    it('keeps a folder under its live parent', async () => {
      const root = await folder('Root');
      const child = await folder('Child', root);
      await removeFolder(child);
      await restore(TRASH_ITEM_KIND.Folder, child);
      expect((await folderRow(child)).parentId).toBe(root);
    });

    it('restores several entries, skips unknown ones and handles a repeated one once', async () => {
      const x = await link();
      const y = await link();
      await a.delete(`${LINKS}/${x}`).expect(204);
      await a.delete(`${LINKS}/${y}`).expect(204);
      const res = await a
        .post(TRASH_ENDPOINT.Restore)
        .send({
          items: [
            { kind: TRASH_ITEM_KIND.Link, id: x },
            { kind: TRASH_ITEM_KIND.Link, id: x },
            { kind: TRASH_ITEM_KIND.Link, id: y },
            { kind: TRASH_ITEM_KIND.Link, id: randomUuidV7() },
            { kind: TRASH_ITEM_KIND.Folder, id: randomUuidV7() },
          ],
        })
        .expect(200);
      expect(res.body).toEqual({ count: 2 });
      // A live link is not "in Trash": restoring it again is skipped.
      expect(await restore(TRASH_ITEM_KIND.Link, x)).toEqual({ count: 0 });
    });

    it('does not change updatedAt', async () => {
      const id = await link();
      const before = await linkRow(id);
      await a.delete(`${LINKS}/${id}`).expect(204);
      await restore(TRASH_ITEM_KIND.Link, id);
      expect((await linkRow(id)).updatedAt).toEqual(before.updatedAt);
    });
  });

  describe('delete forever', () => {
    it('removes a link with its tags rows and images', async () => {
      const id = await seedLink(t.db.prisma, ownerId(), { tags: ['x'] });
      await a.delete(`${LINKS}/${id}`).expect(204);
      expect(await purge(TRASH_ITEM_KIND.Link, id)).toEqual({ count: 1 });
      expect(await t.db.prisma.link.count()).toBe(0);
      expect(await t.db.prisma.linkTag.count()).toBe(0);
      expect(await t.db.prisma.tag.count()).toBe(1);
      expect(await purge(TRASH_ITEM_KIND.Link, id)).toEqual({ count: 0 });
    });

    it('does not delete a live link', async () => {
      const id = await link();
      expect(await purge(TRASH_ITEM_KIND.Link, id)).toEqual({ count: 0 });
      expect(await t.db.prisma.link.count()).toBe(1);
    });

    it('removes a folder with its subtree and the links deleted with it, not a link deleted earlier', async () => {
      const root = await folder('Root');
      const child = await folder('Child', root);
      const early = await link(root, 'Early');
      await link(root);
      await link(child);
      await a.delete(`${LINKS}/${early}`).expect(204);
      await removeFolder(root);

      expect(await purge(TRASH_ITEM_KIND.Folder, root)).toEqual({ count: 1 });
      expect(await t.db.prisma.folder.count()).toBe(0);
      const left = await t.db.prisma.link.findMany();
      expect(left.map((row) => row.id)).toEqual([early]);
      expect(left[0]?.folderId).toBeNull();
      const list = await trash();
      expect(list.items.map((item) => item.id)).toEqual([early]);
      expect(list.items[0]?.fromFolderName).toBeNull();
    });

    it('does not delete a live folder', async () => {
      const id = await folder('Live');
      expect(await purge(TRASH_ITEM_KIND.Folder, id)).toEqual({ count: 0 });
      expect(await t.db.prisma.folder.count()).toBe(1);
    });
  });

  describe('DELETE /api/trash (empty)', () => {
    it('deletes every trashed row of the user and leaves live data and other users alone', async () => {
      const root = await folder('Root');
      const liveFolder = await folder('Live');
      const inRoot = await link(root);
      const alone = await link();
      const live = await link(liveFolder);
      const theirs = await seedLink(t.db.prisma, users.intruder.userId);
      await a.delete(`${LINKS}/${alone}`).expect(204);
      await removeFolder(root);
      await b.delete(`${LINKS}/${theirs}`).expect(204);

      expect((await a.delete(TRASH_ENDPOINT.Base).expect(200)).body).toEqual({ count: 2 });
      expect(await t.db.prisma.link.findUnique({ where: { id: inRoot } })).toBeNull();
      expect(await t.db.prisma.link.findUnique({ where: { id: alone } })).toBeNull();
      expect(await t.db.prisma.link.findUnique({ where: { id: live } })).not.toBeNull();
      expect(await t.db.prisma.folder.findUnique({ where: { id: liveFolder } })).not.toBeNull();
      expect((await trash()).total).toBe(0);
      expect((await trash(b)).total).toBe(1);
      expect((await a.delete(TRASH_ENDPOINT.Base).expect(200)).body).toEqual({ count: 0 });
    });
  });

  describe('validation', () => {
    const post = (path: string, body: unknown) => a.post(path).send(body as object);

    it.each([TRASH_ENDPOINT.Restore, TRASH_ENDPOINT.Delete])(
      '%s rejects bad bodies',
      async (path) => {
        const ok = { kind: TRASH_ITEM_KIND.Link, id: randomUuidV7() };
        await post(path, {}).expect(400);
        await post(path, { items: [] }).expect(400);
        await post(path, { items: 'x' }).expect(400);
        await post(path, {
          items: Array.from({ length: TRASH_LIMIT.BatchMax + 1 }, () => ok),
        }).expect(400);
        await post(path, { items: [{ kind: 'tag', id: ok.id }] }).expect(400);
        await post(path, { items: [{ kind: 'link', id: 'nope' }] }).expect(400);
        await post(path, { items: [{ ...ok, extra: 1 }] }).expect(400);
        await post(path, { items: [ok], extra: 1 }).expect(400);
        await post(path, { items: [ok] }).expect(200);
      },
    );

    it('accepts a full batch', async () => {
      const items = Array.from({ length: TRASH_LIMIT.BatchMax }, () => ({
        kind: TRASH_ITEM_KIND.Link,
        id: randomUuidV7(),
      }));
      await post(TRASH_ENDPOINT.Restore, { items }).expect(200);
    });
  });

  describe('security', () => {
    it('requires a session on every route', async () => {
      const anon = anonymous(t.app);
      const body = { items: [{ kind: 'link', id: randomUuidV7() }] };
      await anon.get(TRASH_ENDPOINT.Base).expect(401);
      await anon.post(TRASH_ENDPOINT.Restore).send(body).expect(401);
      await anon.post(TRASH_ENDPOINT.Delete).send(body).expect(401);
      await anon.delete(TRASH_ENDPOINT.Base).expect(401);
    });

    it('refuses a foreign origin and a non-JSON body on the writes (CSRF guard)', async () => {
      const body = { items: [{ kind: 'link', id: randomUuidV7() }] };
      await a
        .post(TRASH_ENDPOINT.Restore)
        .set('Origin', 'https://evil.test')
        .send(body)
        .expect(403);
      await a.delete(TRASH_ENDPOINT.Base).set('Origin', 'https://evil.test').expect(403);
      await a
        .post(TRASH_ENDPOINT.Delete)
        .set('Content-Type', 'text/plain')
        .send(JSON.stringify(body))
        .expect(415);
    });

    it('isolates every route: the intruder sees nothing and changes nothing', async () => {
      const root = await folder('Secret folder');
      const inRoot = await link(root);
      const alone = await link(undefined, 'Secret link');
      await a.delete(`${LINKS}/${alone}`).expect(204);
      await removeFolder(root);
      const before = await trash();
      expect(before.total).toBe(2);

      // The intruder's own Trash is empty; nothing of the owner shows.
      expect(await trash(b)).toEqual({ items: [], total: 0, retentionDays: 30 });

      // Foreign ids are skipped silently: count 0, same answer as for a missing id.
      expect(await restore(TRASH_ITEM_KIND.Link, alone, b)).toEqual({ count: 0 });
      expect(await restore(TRASH_ITEM_KIND.Folder, root, b)).toEqual({ count: 0 });
      expect(await purge(TRASH_ITEM_KIND.Link, alone, b)).toEqual({ count: 0 });
      expect(await purge(TRASH_ITEM_KIND.Folder, root, b)).toEqual({ count: 0 });
      expect((await b.delete(TRASH_ENDPOINT.Base).expect(200)).body).toEqual({ count: 0 });

      expect(await trash()).toEqual(before);
      expect((await linkRow(inRoot)).deletedAt).not.toBeNull();
      expect((await linkRow(alone)).deletedAt).not.toBeNull();
      expect((await folderRow(root)).deletedAt).not.toBeNull();
    });
  });
});
