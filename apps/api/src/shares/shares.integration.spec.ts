import { createHash } from 'node:crypto';
import {
  SHARE_ERROR_MESSAGE,
  SHARE_LIMIT,
  SHARE_TOKEN_PATTERN,
  type FolderResponse,
  type FolderShareResponse,
  type PublicCollectionResponse,
} from '@shelfmark/contracts';
import type { Response } from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInAs } from '../../test-utils/sign-in-as';
import { signInDemo } from '../../test-utils/sign-in-demo';

const FOLDERS = '/api/folders';
const share = (folderId: string): string => `${FOLDERS}/${folderId}/share`;
const publicUrl = (token: string): string => `/api/public/collections/${token}`;

function errorShape(res: Response): unknown {
  const { statusCode, error, message } = res.body as Record<string, unknown>;
  return { statusCode, error, message };
}

describe('shares API (public collections)', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  let guest: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
    b = asUser(t.app, users.intruder);
    guest = anonymous(t.app);
  });

  afterEach(async () => {
    resetRateLimits(t.app);
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  async function createFolder(agent: TestAgent, name: string, parentId?: string): Promise<string> {
    const res = await agent.post(FOLDERS).send({ name, parentId }).expect(201);
    return (res.body as FolderResponse).id;
  }

  async function enable(agent: TestAgent, folderId: string): Promise<string> {
    const res = await agent.post(share(folderId)).expect(200);
    const body = res.body as FolderShareResponse;
    if (body.token === null) throw new Error('enable returned no token');
    return body.token;
  }

  async function open(token: string, query = ''): Promise<PublicCollectionResponse> {
    return (await guest.get(`${publicUrl(token)}${query}`).expect(200))
      .body as PublicCollectionResponse;
  }

  it('data isolation of the share settings', async () => {
    await expectIsolated(t.app, users, {
      create: async (owner) => {
        const id = await createFolder(owner, 'Recipes');
        await owner.post(share(id)).expect(200);
        return id;
      },
      read: (u, id) => u.get(share(id)),
      update: (u, id) => u.patch(share(id)).send({ showNotes: true }),
      remove: (u, id) => u.delete(share(id)),
      reference: (u, id) => u.post(`${share(id)}/reset`),
      skip: { list: 'there is no list of shares; the state is read per folder' },
    });
  });

  it('the intruder cannot enable a foreign folder, and the owner token survives', async () => {
    const folder = await createFolder(a, 'Recipes');
    const token = await enable(a, folder);

    const foreign = await b.post(share(folder));
    expect(foreign.status).toBe(404);
    const reset = await b.post(`${share(folder)}/reset`);
    expect(reset.status).toBe(404);

    expect((await a.get(share(folder)).expect(200)).body).toMatchObject({ token, enabled: true });
    await open(token);
  });

  it('enable makes a 128-bit base64url token, is idempotent and is off by default', async () => {
    const folder = await createFolder(a, 'Recipes');
    const before = (await a.get(share(folder)).expect(200)).body as FolderShareResponse;
    expect(before).toEqual({
      folderId: folder,
      enabled: false,
      token: null,
      showNotes: false,
      createdAt: null,
    });

    const token = await enable(a, folder);
    expect(token).toMatch(SHARE_TOKEN_PATTERN);
    expect(token).toHaveLength(SHARE_LIMIT.TokenLength);
    expect(Buffer.from(token, 'base64url')).toHaveLength(SHARE_LIMIT.TokenBytes);

    const again = (await a.post(share(folder)).expect(200)).body as FolderShareResponse;
    expect(again.token).toBe(token);
    expect(again.showNotes).toBe(false);

    const other = await enable(a, await createFolder(a, 'Other'));
    expect(other).not.toBe(token);
  });

  it('a guest opens the collection without a session, with noindex and no-store', async () => {
    const owner = await signInAs(t.app, t.baseUrl, {
      email: 'ada@example.com',
      name: 'Ada  Lovelace',
    });
    const ada = asUser(t.app, owner);
    const folder = await createFolder(ada, 'Recipes');
    await seedLink(t.db.prisma, owner.userId, {
      folderId: folder,
      title: 'Ramen',
      url: 'https://ramen.example/',
    });
    const token = await enable(ada, folder);

    const res = await guest.get(publicUrl(token)).expect(200);
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['set-cookie']).toBeUndefined();
    const body = res.body as PublicCollectionResponse;
    expect(body).toMatchObject({
      ownerName: 'Ada',
      name: 'Recipes',
      linkCount: 1,
      subfolders: [],
      page: 1,
      hasMore: false,
    });
    expect(body.items).toEqual([
      expect.objectContaining({ title: 'Ramen', url: 'https://ramen.example/', note: null }),
    ]);
    expect(Object.keys(body.items[0]).sort()).toEqual(
      ['faviconUrl', 'id', 'imageUrl', 'note', 'title', 'url'].sort(),
    );
    const text = JSON.stringify(body);
    expect(text).not.toContain('ada@example.com');
    expect(text).not.toContain(owner.userId);
    expect(text).not.toContain(folder);
  });

  it('unknown, malformed, disabled and reset tokens are the same 404', async () => {
    const folder = await createFolder(a, 'Recipes');
    const token = await enable(a, folder);

    const unknown = await guest.get(publicUrl('A'.repeat(SHARE_LIMIT.TokenLength)));
    const malformed = await guest.get(publicUrl('not-a-token'));
    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(errorShape(unknown)).toEqual({
      statusCode: 404,
      error: 'Not Found',
      message: SHARE_ERROR_MESSAGE.NotFound,
    });
    expect(errorShape(malformed)).toEqual(errorShape(unknown));
    expect(unknown.headers['x-robots-tag']).toBe('noindex, nofollow');

    const reset = (await a.post(`${share(folder)}/reset`).expect(200)).body as FolderShareResponse;
    expect(reset.token).not.toBe(token);
    expect(reset.token).toMatch(SHARE_TOKEN_PATTERN);
    const old = await guest.get(publicUrl(token));
    expect(old.status).toBe(404);
    expect(errorShape(old)).toEqual(errorShape(unknown));
    await open(reset.token ?? '');

    await a.delete(share(folder)).expect(204);
    await a.delete(share(folder)).expect(204);
    const disabled = await guest.get(publicUrl(reset.token ?? ''));
    expect(disabled.status).toBe(404);
    expect(errorShape(disabled)).toEqual(errorShape(unknown));
    expect((await a.get(share(folder)).expect(200)).body).toMatchObject({ enabled: false });

    // Turning it on again makes a new token: the old ones never come back.
    const fresh = await enable(a, folder);
    expect([token, reset.token]).not.toContain(fresh);
  });

  it('settings of a folder that is not shared are a 404', async () => {
    const folder = await createFolder(a, 'Recipes');
    expect((await a.patch(share(folder)).send({ showNotes: true })).status).toBe(404);
    expect((await a.post(`${share(folder)}/reset`)).status).toBe(404);
    expect((await a.patch(share(folder)).send({ showNotes: 'yes' })).status).toBe(400);
  });

  it('hides notes unless the owner turns them on', async () => {
    const folder = await createFolder(a, 'Recipes');
    await seedLink(t.db.prisma, users.owner.userId, { folderId: folder, note: 'Secret why' });
    const token = await enable(a, folder);

    expect((await open(token)).items[0].note).toBeNull();
    expect(JSON.stringify(await open(token))).not.toContain('Secret why');

    const on = (await a.patch(share(folder)).send({ showNotes: true }).expect(200))
      .body as FolderShareResponse;
    expect(on).toMatchObject({ showNotes: true, token });
    expect((await open(token)).items[0].note).toBe('Secret why');

    await a.patch(share(folder)).send({ showNotes: false }).expect(200);
    expect((await open(token)).items[0].note).toBeNull();
  });

  it('shows only the shared subtree: no parent, sibling, unsorted or foreign links', async () => {
    const owner = users.owner.userId;
    const parent = await createFolder(a, 'Food');
    const shared = await createFolder(a, 'Recipes', parent);
    const baking = await createFolder(a, 'Baking', shared);
    const bread = await createFolder(a, 'Bread', baking);
    const weeknight = await createFolder(a, 'Weeknight', shared);
    const sibling = await createFolder(a, 'Restaurants', parent);
    const foreign = await createFolder(b, 'Recipes');

    await seedLink(t.db.prisma, owner, { folderId: shared, title: 'In root' });
    await seedLink(t.db.prisma, owner, { folderId: baking, title: 'In baking' });
    await seedLink(t.db.prisma, owner, { folderId: bread, title: 'In bread' });
    await seedLink(t.db.prisma, owner, { folderId: weeknight, title: 'In weeknight' });
    await seedLink(t.db.prisma, owner, { folderId: parent, title: 'In parent' });
    await seedLink(t.db.prisma, owner, { folderId: sibling, title: 'In sibling' });
    await seedLink(t.db.prisma, owner, { title: 'Unsorted' });
    await seedLink(t.db.prisma, users.intruder.userId, { folderId: foreign, title: 'Foreign' });

    const token = await enable(a, shared);
    const body = await open(token);
    expect(body.items.map((link) => link.title).sort()).toEqual(
      ['In baking', 'In bread', 'In root', 'In weeknight'].sort(),
    );
    expect(body.linkCount).toBe(4);
    expect(body.subfolders).toEqual([
      { id: baking, name: 'Baking', linkCount: 2 },
      { id: weeknight, name: 'Weeknight', linkCount: 1 },
    ]);
    const text = JSON.stringify(body);
    for (const hidden of [parent, sibling, foreign, 'Food', 'Restaurants']) {
      expect(text).not.toContain(hidden);
    }

    const filtered = await open(token, `?folder=${baking}`);
    expect(filtered.items.map((link) => link.title).sort()).toEqual(['In baking', 'In bread']);
    expect(filtered.linkCount).toBe(4);

    for (const outside of [parent, sibling, foreign]) {
      const res = await guest.get(`${publicUrl(token)}?folder=${outside}`);
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ message: SHARE_ERROR_MESSAGE.NotFound });
    }
    expect((await guest.get(`${publicUrl(token)}?folder=nope`)).status).toBe(400);
  });

  it('a link moved out of the subtree disappears; a deleted folder ends the link', async () => {
    const shared = await createFolder(a, 'Recipes');
    const other = await createFolder(a, 'Other');
    const link = await seedLink(t.db.prisma, users.owner.userId, { folderId: shared });
    const token = await enable(a, shared);
    expect((await open(token)).items).toHaveLength(1);

    await a.patch(`/api/links/${link}`).send({ folderId: other }).expect(200);
    expect((await open(token)).items).toHaveLength(0);

    await a.delete(`${FOLDERS}/${shared}?mode=delete-links`).expect(204);
    expect((await guest.get(publicUrl(token))).status).toBe(404);
    expect(await t.db.prisma.folderShare.count()).toBe(0);
  });

  it('demo users cannot share', async () => {
    const demo = await signInDemo(t.app, t.baseUrl);
    const agent = asUser(t.app, demo);
    const folder = await t.db.prisma.folder.findFirstOrThrow({
      where: { userId: demo.userId },
      select: { id: true },
    });
    const res = await agent.post(share(folder.id));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: SHARE_ERROR_MESSAGE.DemoUser });
    expect(await t.db.prisma.folderShare.count()).toBe(0);
  });

  it(`allows at most ${SHARE_LIMIT.PerUserMax} public folders per user`, async () => {
    const ids = await t.db.prisma.folder.createManyAndReturn({
      data: Array.from({ length: SHARE_LIMIT.PerUserMax + 1 }, (_, i) => ({
        userId: users.owner.userId,
        name: `Folder ${i}`,
      })),
      select: { id: true },
    });
    for (const { id } of ids.slice(0, SHARE_LIMIT.PerUserMax)) {
      await enable(a, id);
      resetRateLimits(t.app);
    }
    const over = await a.post(share(ids[SHARE_LIMIT.PerUserMax].id));
    expect(over.status).toBe(409);
    expect(over.body).toMatchObject({ message: SHARE_ERROR_MESSAGE.LimitReached });

    // Re-enabling a shared one is still fine, and disabling frees a slot.
    await a.post(share(ids[0].id)).expect(200);
    await a.delete(share(ids[0].id)).expect(204);
    await enable(a, ids[SHARE_LIMIT.PerUserMax].id);
    // The intruder's limit is their own.
    await enable(b, await createFolder(b, 'Mine'));
  });

  it(`pages the links and never lists more than ${SHARE_LIMIT.MaxLinks}`, async () => {
    const folder = await createFolder(a, 'Big');
    const total = SHARE_LIMIT.MaxLinks + 20;
    const base = Date.UTC(2026, 0, 1);
    await t.db.prisma.link.createMany({
      data: Array.from({ length: total }, (_, i) => ({
        userId: users.owner.userId,
        folderId: folder,
        url: `https://example.test/${i}`,
        normalizedUrl: `https://example.test/${i}`,
        title: `Link ${i}`,
        titleSortKey: `link ${i}`,
        createdAt: new Date(base + i * 1000),
      })),
    });
    const token = await enable(a, folder);

    const first = await open(token);
    expect(first.linkCount).toBe(total);
    expect(first.items).toHaveLength(SHARE_LIMIT.PageSize);
    expect(first.items[0].title).toBe(`Link ${total - 1}`);
    expect(first.hasMore).toBe(true);

    const seen = new Set(first.items.map((link) => link.id));
    let last = first;
    for (let page = 2; page <= SHARE_LIMIT.MaxPage; page++) {
      last = await open(token, `?page=${page}`);
      for (const link of last.items) seen.add(link.id);
    }
    expect(seen.size).toBe(SHARE_LIMIT.MaxLinks);
    expect(last.page).toBe(SHARE_LIMIT.MaxPage);
    expect(last.hasMore).toBe(false);
    expect((await guest.get(`${publicUrl(token)}?page=${SHARE_LIMIT.MaxPage + 1}`)).status).toBe(
      400,
    );
    expect((await guest.get(`${publicUrl(token)}?page=0`)).status).toBe(400);
  });

  it('rate-limits the public route per client', async () => {
    const token = await enable(a, await createFolder(a, 'Recipes'));
    const from = (ip: string) => guest.get(publicUrl(token)).set('X-Forwarded-For', ip);
    for (let i = 0; i < 30; i++) {
      expect((await from('203.0.113.7')).status).toBe(200);
    }
    const blocked = await from('203.0.113.7');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect((await from('203.0.113.8')).status).toBe(200);
  });

  describe('images', () => {
    const bytes = Buffer.from('RIFF0000WEBPVP8 fake image bytes');
    const sha256 = createHash('sha256').update(bytes).digest('hex');

    async function addImage(linkId: string, userId: string): Promise<void> {
      await t.db.prisma.linkImage.create({
        data: {
          userId,
          linkId,
          kind: 'favicon',
          contentType: 'image/webp',
          bytes,
          width: 32,
          height: 32,
          sha256,
        },
      });
    }

    it('serves the images of links in the subtree only, by token', async () => {
      const shared = await createFolder(a, 'Recipes');
      const outside = await createFolder(a, 'Private');
      const inside = await seedLink(t.db.prisma, users.owner.userId, { folderId: shared });
      const hidden = await seedLink(t.db.prisma, users.owner.userId, { folderId: outside });
      await addImage(inside, users.owner.userId);
      await addImage(hidden, users.owner.userId);
      const token = await enable(a, shared);

      const body = await open(token);
      const path = `/api/public/collections/${token}/links/${inside}/favicon?v=${sha256.slice(0, 16)}`;
      expect(body.items[0]).toMatchObject({ faviconUrl: path, imageUrl: null });

      const res = await guest.get(path).expect(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
      expect(Buffer.from(res.body as Buffer)).toEqual(bytes);

      const missing = await guest.get(`/api/public/collections/${token}/links/${inside}/image`);
      const outsideImage = await guest.get(
        `/api/public/collections/${token}/links/${hidden}/favicon`,
      );
      const badId = await guest.get(`/api/public/collections/${token}/links/nope/favicon`);
      for (const miss of [missing, outsideImage, badId]) {
        expect(miss.status).toBe(404);
        expect(errorShape(miss)).toEqual({
          statusCode: 404,
          error: 'Not Found',
          message: SHARE_ERROR_MESSAGE.NotFound,
        });
      }

      await a.delete(share(shared)).expect(204);
      expect((await guest.get(path)).status).toBe(404);
    });
  });
});
