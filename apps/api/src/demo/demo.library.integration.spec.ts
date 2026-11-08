import { AUTH_ENDPOINT, DEMO_LIMIT } from '@shelfmark/contracts';
import type {
  GetSessionResponse,
  LinkResponse,
  ListFoldersResponse,
  ListLinksResponse,
  ListTagsResponse,
} from '@shelfmark/contracts';
import request from 'supertest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInAs } from '../../test-utils/sign-in-as';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { DEMO_SEED } from './demo-seed';

const LINKS = '/api/links';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('demo library, limits and expiry', () => {
  let t: AuthTestApp;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  afterEach(async () => {
    await t.db.truncateAll();
    resetRateLimits(t.app);
  });

  afterAll(async () => {
    await t.close();
  });

  describe('seed', () => {
    it('gives the new user the seed library: counts, nesting, tags and dates', async () => {
      const before = Date.now();
      const demo = await signInDemo(t.app, t.baseUrl);
      const where = { userId: demo.userId };

      expect(await t.db.prisma.link.count({ where })).toBe(DEMO_SEED.links.length);
      expect(await t.db.prisma.tag.count({ where })).toBe(DEMO_SEED.tags.length);
      const folders = await t.db.prisma.folder.findMany({ where, include: { parent: true } });
      expect(folders).toHaveLength(DEMO_SEED.folders.length);
      const nested = folders.filter((folder) => folder.parentId !== null);
      expect(nested).toHaveLength(1);
      expect(nested[0]?.parent?.name).toBe('Work');
      expect(await t.db.prisma.linkTag.count({ where: { link: where } })).toBe(
        DEMO_SEED.links.reduce((sum, link) => sum + link.tags.length, 0),
      );

      const links = await t.db.prisma.link.findMany({ where });
      const newest = Math.max(...links.map((link) => link.createdAt.getTime()));
      const oldest = Math.min(...links.map((link) => link.createdAt.getTime()));
      expect(newest).toBeLessThanOrEqual(Date.now());
      expect(newest).toBeGreaterThan(before - DAY_MS);
      expect(before - oldest).toBeGreaterThan(20 * DAY_MS);
      expect(links.some((link) => link.lastOpenedAt !== null)).toBe(true);
      expect(links.some((link) => link.isFavorite)).toBe(true);
      for (const link of links) {
        expect(link.titleSortKey).toBe(link.title.toLowerCase());
      }
    });

    it('is readable through the API as the demo user, and each demo user has their own copy', async () => {
      const first = await signInDemo(t.app, t.baseUrl);
      const second = await signInDemo(t.app, t.baseUrl);
      for (const user of [first, second]) {
        const links = await asUser(t.app, user).get(`${LINKS}?limit=100`).expect(200);
        expect((links.body as ListLinksResponse).items).toHaveLength(DEMO_SEED.links.length);
        const folders = await asUser(t.app, user).get('/api/folders').expect(200);
        expect((folders.body as ListFoldersResponse).items).toHaveLength(DEMO_SEED.folders.length);
        const tags = await asUser(t.app, user).get('/api/tags').expect(200);
        expect((tags.body as ListTagsResponse).items).toHaveLength(DEMO_SEED.tags.length);
      }
    });
  });

  describe('link cap', () => {
    it('answers 409 for the 101st link of a demo user, not for the 100th', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const agent = asUser(t.app, demo);
      for (let i = DEMO_SEED.links.length; i < DEMO_LIMIT.MaxLinks - 1; i++) {
        await seedLink(t.db.prisma, demo.userId);
      }
      // 99 links: the 100th is allowed.
      await agent.post(LINKS).send({ url: 'https://cap.test/100', title: 'hundredth' }).expect(201);
      expect(await t.db.prisma.link.count({ where: { userId: demo.userId } })).toBe(
        DEMO_LIMIT.MaxLinks,
      );
      const res = await agent
        .post(LINKS)
        .send({ url: 'https://cap.test/101', title: 'one too many' })
        .expect(409);
      expect((res.body as { message: string }).message).toMatch(/demo link limit/i);
      expect(await t.db.prisma.link.count({ where: { userId: demo.userId } })).toBe(
        DEMO_LIMIT.MaxLinks,
      );
    });

    it('does not cap regular users at the demo limit', async () => {
      const regular = await signInAs(t.app, t.baseUrl, { email: 'big@example.com', name: 'Big' });
      for (let i = 0; i < DEMO_LIMIT.MaxLinks; i++) {
        await seedLink(t.db.prisma, regular.userId);
      }
      await asUser(t.app, regular)
        .post(LINKS)
        .send({ url: 'https://big.test/x', title: 'beyond the demo cap' })
        .expect(201);
    });
  });

  describe('expiry', () => {
    it('answers 401 on protected routes and null on get-session once the sandbox has expired', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await asUser(t.app, demo).get(LINKS).expect(200);
      const live = await asUser(t.app, demo).get(AUTH_ENDPOINT.GetSession).expect(200);
      expect((live.body as GetSessionResponse)?.user.isDemo).toBe(true);

      await t.db.prisma.user.update({
        where: { id: demo.userId },
        data: { demoExpiresAt: new Date(Date.now() - 1000) },
      });
      // The cookie and the database session are still valid: only the demo expiry ends it.
      expect(await t.db.prisma.session.count({ where: { userId: demo.userId } })).toBe(1);
      const res = await asUser(t.app, demo).get(LINKS).expect(401);
      expect((res.body as { statusCode: number }).statusCode).toBe(401);
      await asUser(t.app, demo)
        .post(LINKS)
        .send({ url: 'https://x.test/', title: 't' })
        .expect(401);
      const session = await asUser(t.app, demo).get(AUTH_ENDPOINT.GetSession).expect(200);
      expect(session.body).toBeNull();
    });

    it('cannot even store a demo user without an expiry (database check)', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await expect(
        t.db.prisma.user.update({ where: { id: demo.userId }, data: { demoExpiresAt: null } }),
      ).rejects.toThrow(/users_demo_expiry_check/);
    });

    it('caps the reported session expiry at the demo expiry after a sliding refresh', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      const user = await t.db.prisma.user.findUniqueOrThrow({ where: { id: demo.userId } });
      // Simulate Better Auth's refresh: the database session now outlives the sandbox.
      await t.db.prisma.session.updateMany({
        where: { userId: demo.userId },
        data: { expiresAt: new Date(Date.now() + 7 * DAY_MS) },
      });
      const res = await asUser(t.app, demo).get(AUTH_ENDPOINT.GetSession).expect(200);
      const body = res.body as GetSessionResponse;
      expect(body?.session.expiresAt).toBe(user.demoExpiresAt?.toISOString());
    });
  });

  describe('data isolation', () => {
    const create = async (owner: ReturnType<typeof asUser>): Promise<string> =>
      (
        (await owner.post(LINKS).send({ url: 'https://owner.test/a', title: 'secret' }).expect(201))
          .body as LinkResponse
      ).id;

    const scenario = {
      create,
      read: (agent: ReturnType<typeof asUser>, id: string) => agent.get(`${LINKS}/${id}`),
      update: (agent: ReturnType<typeof asUser>, id: string) =>
        agent.patch(`${LINKS}/${id}`).send({ title: 'hacked' }),
      remove: (agent: ReturnType<typeof asUser>, id: string) => agent.delete(`${LINKS}/${id}`),
      list: {
        request: (agent: ReturnType<typeof asUser>) => agent.get(`${LINKS}?limit=100`),
        ids: (body: unknown) => (body as ListLinksResponse).items.map((item) => item.id),
      },
      reference: (agent: ReturnType<typeof asUser>, foreignId: string) =>
        agent.post(LINKS).send({ url: 'https://x.test/', title: 't', folderId: foreignId }),
    };

    it('a demo user cannot reach a regular user data', async () => {
      const owner = await signInAs(t.app, t.baseUrl, { email: 'owner@example.com', name: 'Owner' });
      const intruder = await signInDemo(t.app, t.baseUrl);
      await expectIsolated(t.app, { owner, intruder }, scenario);
    });

    it('a regular user cannot reach a demo user data', async () => {
      const owner = await signInDemo(t.app, t.baseUrl);
      const intruder = await signInAs(t.app, t.baseUrl, { email: 'in@example.com', name: 'In' });
      await expectIsolated(t.app, { owner, intruder }, scenario);
    });

    it('two demo users cannot reach each other data', async () => {
      const owner = await signInDemo(t.app, t.baseUrl);
      const intruder = await signInDemo(t.app, t.baseUrl);
      await expectIsolated(t.app, { owner, intruder }, scenario);
    });

    it('keeps the regular isolation harness working with its own users', async () => {
      const users = await createIsolationUsers(t);
      await expectIsolated(t.app, users, scenario);
    });

    it('lets a demo user see none of the seed of another demo user', async () => {
      const first = await signInDemo(t.app, t.baseUrl);
      const second = await signInDemo(t.app, t.baseUrl);
      const firstIds = (
        (await asUser(t.app, first).get(`${LINKS}?limit=100`)).body as ListLinksResponse
      ).items.map((item) => item.id);
      for (const id of firstIds) {
        await request(t.app.getHttpServer())
          .get(`${LINKS}/${id}`)
          .set('Cookie', second.cookie)
          .expect(404);
      }
    });
  });
});
