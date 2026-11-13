import {
  AUTH_PROVIDER,
  LINK_IMAGE_KIND,
  ME_STATS_ENDPOINT,
  ME_STATS_LIMIT,
  statsWeekStarts,
  type MeStatsResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { signInDemo } from '../../test-utils/sign-in-demo';
import { MeStatsService } from './me-stats.service';

const SHA = 'a'.repeat(64);

describe('GET /api/me/stats', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  async function statsOf(cookieUser: IsolationUsers['owner']): Promise<MeStatsResponse> {
    return (await asUser(t.app, cookieUser).get(ME_STATS_ENDPOINT).expect(200))
      .body as MeStatsResponse;
  }

  it('answers 401 without a session', async () => {
    await anonymous(t.app).get(ME_STATS_ENDPOINT).expect(401);
  });

  it('a new account: zeros, 12 empty weeks, the provider it signed in with', async () => {
    const stats = await statsOf(users.owner);

    expect(stats).toEqual({
      linkCount: 0,
      folderCount: 0,
      tagCount: 0,
      topSites: [],
      topTags: [],
      weeklyLinks: statsWeekStarts(new Date()).map((weekStart) => ({ weekStart, count: 0 })),
      memberSince: expect.any(String),
      oldestLinkAt: null,
      connectedAccounts: [{ provider: AUTH_PROVIDER.GitHub, connectedAt: expect.any(String) }],
    });
    const user = await t.db.prisma.user.findUniqueOrThrow({ where: { id: users.owner.userId } });
    expect(stats.memberSince).toBe(user.createdAt.toISOString());
    // Never a token, scope or provider account id.
    expect(Object.keys(stats.connectedAccounts[0]).sort()).toEqual(['connectedAt', 'provider']);
  });

  it('counts live links, folders and tags; top sites with favicons, top tags, weeks', async () => {
    const prisma = t.db.prisma;
    const owner = users.owner.userId;
    const now = new Date();
    const folder = await prisma.folder.create({ data: { userId: owner, name: 'Reading' } });
    await prisma.folder.create({ data: { userId: owner, name: 'Gone', deletedAt: now } });
    const old = new Date(now.getTime() - 200 * 86_400_000);
    await seedLink(prisma, owner, {
      url: 'https://www.GitHub.com/a',
      tags: ['dev'],
      createdAt: old,
    });
    const newestGithub = await seedLink(prisma, owner, {
      url: 'https://github.com/b',
      tags: ['dev', 'angular'],
      folderId: folder.id,
    });
    await seedLink(prisma, owner, { url: 'https://user:pw@docs.example.org:8443/x?q=1' });
    await seedLink(prisma, owner, { url: 'https://zeta.test/' });
    await seedLink(prisma, owner, { url: 'https://alpha.test/' });
    await seedLink(prisma, owner, { url: 'https://beta.test/' });
    const trashed = await seedLink(prisma, owner, { url: 'https://github.com/c', tags: ['dev'] });
    await prisma.link.update({ where: { id: trashed }, data: { deletedAt: now } });
    // A tag on no live link, or only on a trashed one, is not counted at all.
    await prisma.tag.create({ data: { userId: owner, name: 'unused' } });
    const trashedOnly = await seedLink(prisma, owner, {
      url: 'https://old.test/',
      tags: ['archived'],
    });
    await prisma.link.update({ where: { id: trashedOnly }, data: { deletedAt: now } });
    await prisma.linkImage.create({
      data: {
        userId: owner,
        linkId: newestGithub,
        kind: LINK_IMAGE_KIND.Favicon,
        contentType: 'image/webp',
        bytes: Buffer.from([1]),
        width: 32,
        height: 32,
        sha256: SHA,
      },
    });

    const stats = await statsOf(users.owner);

    expect(stats.linkCount).toBe(6);
    expect(stats.folderCount).toBe(1);
    expect(stats.tagCount).toBe(2);
    expect(stats.topSites).toEqual([
      {
        host: 'github.com',
        count: 2,
        faviconUrl: `/api/links/${newestGithub}/favicon?v=${SHA.slice(0, 16)}`,
      },
      { host: 'alpha.test', count: 1, faviconUrl: null },
      { host: 'beta.test', count: 1, faviconUrl: null },
      { host: 'docs.example.org', count: 1, faviconUrl: null },
      { host: 'zeta.test', count: 1, faviconUrl: null },
    ]);
    expect(stats.topSites).toHaveLength(ME_STATS_LIMIT.TopSites);
    expect(stats.topTags).toEqual([
      { name: 'dev', count: 2 },
      { name: 'angular', count: 1 },
    ]);
    expect(stats.weeklyLinks).toHaveLength(ME_STATS_LIMIT.Weeks);
    // The old link is outside the 12 weeks; the five new live ones are in the current week.
    expect(stats.weeklyLinks.at(-1)?.count).toBe(5);
    expect(stats.weeklyLinks.reduce((sum, week) => sum + week.count, 0)).toBe(5);
    expect(stats.oldestLinkAt).toBe(old.toISOString());
  });

  it('puts each link in its UTC week', async () => {
    const owner = users.owner.userId;
    const now = new Date('2026-11-13T12:00:00Z');
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-11-09T00:00:00Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-11-08T23:59:59Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-08-24T00:00:00Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-08-23T23:00:00Z') });

    const stats = await t.app.get(MeStatsService).stats(owner, undefined, now);

    expect(stats.weeklyLinks.at(-1)).toEqual({ weekStart: '2026-11-09', count: 1 });
    expect(stats.weeklyLinks.at(-2)).toEqual({ weekStart: '2026-11-02', count: 1 });
    expect(stats.weeklyLinks[0]).toEqual({ weekStart: '2026-08-24', count: 1 });
  });

  it('starts the weeks on the requested first day (Sunday)', async () => {
    const owner = users.owner.userId;
    const now = new Date('2026-11-13T12:00:00Z');
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-11-08T00:00:00Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-11-09T12:00:00Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-11-07T23:59:59Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-08-23T00:00:00Z') });
    await seedLink(t.db.prisma, owner, { createdAt: new Date('2026-08-22T23:00:00Z') });

    const stats = await t.app.get(MeStatsService).stats(owner, 7, now);

    expect(stats.weeklyLinks.map((week) => week.weekStart)).toEqual(statsWeekStarts(now, 7));
    expect(stats.weeklyLinks.at(-1)).toEqual({ weekStart: '2026-11-08', count: 2 });
    expect(stats.weeklyLinks.at(-2)).toEqual({ weekStart: '2026-11-01', count: 1 });
    expect(stats.weeklyLinks[0]).toEqual({ weekStart: '2026-08-23', count: 1 });
  });

  it('takes firstDay from the query and refuses anything but 1 to 7', async () => {
    const agent = asUser(t.app, users.owner);
    const sunday = (await agent.get(`${ME_STATS_ENDPOINT}?firstDay=7`).expect(200))
      .body as MeStatsResponse;
    expect(sunday.weeklyLinks.map((week) => week.weekStart)).toEqual(
      statsWeekStarts(new Date(), 7),
    );
    for (const bad of ['0', '8', '1.5', 'monday', '']) {
      const res = await agent.get(`${ME_STATS_ENDPOINT}?firstDay=${bad}`).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    }
    await agent.get(`${ME_STATS_ENDPOINT}?weekStart=7`).expect(400);
  });

  it('data isolation: another user never counts or sees the owner data', async () => {
    const owner = users.owner.userId;
    await t.db.prisma.folder.create({ data: { userId: owner, name: 'Private' } });
    await seedLink(t.db.prisma, owner, { url: 'https://secret.example/', tags: ['secret'] });

    const intruder = await statsOf(users.intruder);
    expect(intruder.linkCount).toBe(0);
    expect(intruder.folderCount).toBe(0);
    expect(intruder.tagCount).toBe(0);
    expect(intruder.topSites).toEqual([]);
    expect(intruder.topTags).toEqual([]);
    expect(intruder.oldestLinkAt).toBeNull();
    expect(JSON.stringify(intruder)).not.toContain('secret');

    const mine = await statsOf(users.owner);
    expect(mine.linkCount).toBe(1);
    expect(mine.topSites.map((site) => site.host)).toEqual(['secret.example']);
  });

  it('a demo account shows its own numbers and has no connected accounts', async () => {
    const demo = await signInDemo(t.app, t.baseUrl);
    const stats = (await asUser(t.app, demo).get(ME_STATS_ENDPOINT).expect(200))
      .body as MeStatsResponse;

    expect(stats.connectedAccounts).toEqual([]);
    const live = await t.db.prisma.link.count({ where: { userId: demo.userId, deletedAt: null } });
    expect(stats.linkCount).toBe(live);
  });
});
