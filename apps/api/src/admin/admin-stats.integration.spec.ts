import { expectAdminStatsShape } from '@shelfmark/contract-tests';
import {
  ADMIN_ENDPOINT,
  ADMIN_STATS_FEATURE,
  ADMIN_STATS_LIMIT,
  FEEDBACK_STATUS,
  type AdminStatsFeature,
  type AdminStatsResponse,
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

const STATS = ADMIN_ENDPOINT.Stats;
const DAY_MS = 86_400_000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function utcDate(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00Z`);
}

describe('admin usage stats API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let admin: TestAgent;
  let counter = 0;
  const savedEnv = process.env['ADMIN_EMAILS'];

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    process.env['ADMIN_EMAILS'] = 'owner@example.com, second-admin@example.com';
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    // owner is the admin; intruder is a real user.
    admin = asUser(t.app, users.owner);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    if (savedEnv === undefined) delete process.env['ADMIN_EMAILS'];
    else process.env['ADMIN_EMAILS'] = savedEnv;
    await t.close();
  });

  /** A real (non-demo) user straight in the database. */
  async function user(
    data: {
      email?: string;
      createdAt?: Date;
      lastActiveOn?: Date | null;
      isDemo?: boolean;
      theme?: string;
      appearanceSavedAt?: Date | null;
      onboardingCompletedAt?: Date | null;
      fetchPreviews?: boolean;
      historyPaused?: boolean;
      customColours?: string[];
      customEmoji?: string[];
    } = {},
  ): Promise<string> {
    counter += 1;
    const { email, isDemo, ...rest } = data;
    const row = await t.db.prisma.user.create({
      data: {
        name: `Person ${counter}`,
        email: email ?? `person-${counter}@example.com`,
        emailVerified: true,
        ...(isDemo ? { isDemo: true, demoExpiresAt: new Date(Date.now() + 3_600_000) } : {}),
        ...rest,
      },
      select: { id: true },
    });
    return row.id;
  }

  async function stats(): Promise<AdminStatsResponse> {
    const res = await admin.get(STATS).expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    return res.body as AdminStatsResponse;
  }

  function adoption(body: AdminStatsResponse, feature: AdminStatsFeature) {
    return body.features.adoption.find((row) => row.feature === feature)?.rate;
  }

  describe('who may read it', () => {
    it('is 404 for a guest, a regular user and while ADMIN_EMAILS is unset', async () => {
      await anonymous(t.app).get(STATS).expect(404);
      await asUser(t.app, users.intruder).get(STATS).expect(404);
      delete process.env['ADMIN_EMAILS'];
      await admin.get(STATS).expect(404);
    });

    it('is 404 for a demo user and for an unverified admin email', async () => {
      const demo = await signInDemo(t.app, t.baseUrl);
      await asUser(t.app, demo).get(STATS).expect(404);
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { emailVerified: false },
      });
      await admin.get(STATS).expect(404);
    });

    it('is rate limited', async () => {
      for (let i = 0; i < 60; i++) await admin.get(STATS).expect(200);
      await admin.get(STATS).expect(429);
    });
  });

  describe('privacy', () => {
    it('answers only the allow-listed aggregate fields, without ids, emails, names or URLs', async () => {
      const id = await user({ email: 'reader@example.com' });
      await seedLink(t.db.prisma, id, {
        url: 'https://secret.example/page',
        title: 'Secret title',
        note: 'Private note',
      });
      await t.db.prisma.feedback.create({
        data: { userId: id, milestone: 'day3', score: 9, comment: 'Private comment' },
      });
      const body = await stats();
      expectAdminStatsShape(body);
      const text = JSON.stringify(body);
      for (const secret of [
        id,
        users.intruder.userId,
        users.owner.userId,
        'reader@example.com',
        'intruder@example.com',
        'Person',
        'Intruder',
        'secret.example',
        'Secret title',
        'Private note',
        'Private comment',
      ]) {
        expect(text).not.toContain(secret);
      }
    });

    it('leaves out admin and demo accounts and counts demo sandboxes on their own', async () => {
      await user({ email: 'Second-Admin@Example.com' });
      await user({ isDemo: true });
      await signInDemo(t.app, t.baseUrl);
      const body = await stats();
      // Only intruder is a real user: owner and second-admin are admins.
      expect(body.overview.realUsers).toBe(1);
      expect(body.overview.demoSandboxes).toBe(2);
      expect(body.minGroup).toBe(ADMIN_STATS_LIMIT.MinGroup);
    });

    it('hides shares, means and ratings while there are fewer than 3 real users', async () => {
      const id = await user();
      await seedLink(t.db.prisma, id);
      const body = await stats();
      expect(body.overview.realUsers).toBe(2);
      expect(body.overview.onboarded).toEqual({ base: 2, count: null, share: null });
      expect(body.overview.active7d.count).toBeNull();
      expect(body.features.linksPerUser.mean).toBeNull();
      expect(body.features.linksPerUser.median).toBeNull();
      for (const row of body.features.adoption) expect(row.rate.share).toBeNull();
    });

    it('merges small buckets into Other and never reveals a single hidden value', async () => {
      // intruder plus 5: 3 chose dark, 1 chose light, 2 never chose.
      const saved = new Date();
      for (let i = 0; i < 3; i++) await user({ theme: 'dark', appearanceSavedAt: saved });
      await user({ theme: 'light', appearanceSavedAt: saved });
      await user();
      const body = await stats();
      expect(body.overview.realUsers).toBe(6);
      // light (1) alone in Other would be told by elimination: never (2) joins it.
      expect(body.preferences.theme).toEqual([
        { key: 'system', count: 0 },
        { key: 'dark', count: 3 },
        { key: 'custom', count: 0 },
        { key: 'other', count: 3 },
      ]);
      expect(body.preferences.trashRetention).toEqual([
        { key: '7', count: 0 },
        { key: '30', count: 6 },
        { key: '90', count: 0 },
      ]);
    });

    it('stops counting a deleted account on the very next request', async () => {
      const ids = [await user(), await user(), await user()];
      expect((await stats()).overview.realUsers).toBe(4);
      await t.db.prisma.user.delete({ where: { id: ids[0] } });
      expect((await stats()).overview.realUsers).toBe(3);
    });
  });

  describe('numbers', () => {
    it('counts feature adoption from live rows only', async () => {
      const a = await user({ customColours: ['#123456'], historyPaused: true });
      const b = await user({ fetchPreviews: false });
      const c = await user({ customEmoji: ['🦊'] });
      const folder = await t.db.prisma.folder.create({
        data: { userId: a, name: 'Work', pinnedPosition: 0 },
      });
      await t.db.prisma.folder.create({ data: { userId: a, name: 'Sub', parentId: folder.id } });
      await t.db.prisma.folderShare.create({
        data: { userId: a, folderId: folder.id, token: 'abcdefghijklmnopqrstuv' },
      });
      await seedLink(t.db.prisma, a, { tags: ['dev'], isFavorite: true, note: 'x' });
      await seedLink(t.db.prisma, b, { lastOpenedAt: daysAgo(2) });
      await seedLink(t.db.prisma, b, { note: '   ' });
      // Trashed rows do not count as use of folders, tags or favorites, only as Trash.
      const trashed = await seedLink(t.db.prisma, c, { tags: ['old'], isFavorite: true });
      await t.db.prisma.link.update({ where: { id: trashed }, data: { deletedAt: new Date() } });
      await t.db.prisma.folder.create({
        data: { userId: c, name: 'Gone', deletedAt: new Date(), icon: '🎉' },
      });
      // A view of its own counts; the starter views of everyone else do not.
      await t.db.prisma.savedView.create({
        data: { userId: b, name: 'Mine', query: { scope: 'all' }, position: 2 },
      });

      const body = await stats();
      expect(body.overview.realUsers).toBe(4);
      const expected: Partial<Record<AdminStatsFeature, number>> = {
        [ADMIN_STATS_FEATURE.Folders]: 1,
        [ADMIN_STATS_FEATURE.NestedFolders]: 1,
        [ADMIN_STATS_FEATURE.Tags]: 1,
        [ADMIN_STATS_FEATURE.Favorites]: 1,
        [ADMIN_STATS_FEATURE.Notes]: 1,
        [ADMIN_STATS_FEATURE.SidebarPins]: 1,
        [ADMIN_STATS_FEATURE.FolderPins]: 0,
        [ADMIN_STATS_FEATURE.SavedViews]: 1,
        [ADMIN_STATS_FEATURE.Trash]: 1,
        [ADMIN_STATS_FEATURE.PublicCollections]: 1,
        [ADMIN_STATS_FEATURE.OwnColours]: 1,
        [ADMIN_STATS_FEATURE.OwnEmoji]: 1,
        [ADMIN_STATS_FEATURE.OpenedRecently]: 1,
        [ADMIN_STATS_FEATURE.HistoryPaused]: 1,
        [ADMIN_STATS_FEATURE.PreviewsOff]: 1,
      };
      for (const [feature, count] of Object.entries(expected)) {
        expect(adoption(body, feature as AdminStatsFeature), feature).toEqual({
          base: 4,
          count,
          share: count / 4,
        });
      }
      expect(body.features.linksPerUser).toEqual({
        mean: 0.8,
        median: 0.5,
        buckets: [
          // 0 and 1-9 hold 2 people each: both merge into Other.
          { key: '10-49', count: 0 },
          { key: '50-99', count: 0 },
          { key: '100+', count: 0 },
          { key: 'other', count: 4 },
        ],
      });
    });

    it('counts sign-ups per UTC day and week, zero-filled, today last', async () => {
      await user({ createdAt: daysAgo(3) });
      await user({ createdAt: daysAgo(3) });
      await user({ createdAt: daysAgo(40) });
      const body = await stats();
      const days = body.overview.signUpsByDay;
      expect(days).toHaveLength(ADMIN_STATS_LIMIT.SignUpDays);
      expect(days[days.length - 1]).toEqual({
        start: new Date().toISOString().slice(0, 10),
        // intruder signed up today.
        count: 1,
      });
      expect(days[days.length - 4]).toEqual({
        start: daysAgo(3).toISOString().slice(0, 10),
        count: 2,
      });
      expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(3);
      expect(body.overview.signUpsByWeek).toHaveLength(ADMIN_STATS_LIMIT.SignUpWeeks);
      expect(body.overview.signUpsByWeek.reduce((sum, w) => sum + w.count, 0)).toBe(4);
      expect(new Date(`${body.overview.signUpsByWeek[11].start}T00:00:00Z`).getUTCDay()).toBe(1);
    });

    it('counts active users and who came back a week and a month after joining', async () => {
      const today = utcDate(new Date());
      await t.db.prisma.user.update({
        where: { id: users.intruder.userId },
        data: { lastActiveOn: today },
      });
      // Joined 40 days ago: back on day 35 (week and month), on day 20 (week only), never.
      await user({ createdAt: daysAgo(40), lastActiveOn: utcDate(daysAgo(5)) });
      await user({ createdAt: daysAgo(40), lastActiveOn: utcDate(daysAgo(20)) });
      await user({ createdAt: daysAgo(40), lastActiveOn: utcDate(daysAgo(40)) });
      // Joined 3 days ago: not in the week base yet.
      await user({ createdAt: daysAgo(3), lastActiveOn: today });
      const body = await stats();
      expect(body.overview.active7d).toEqual({ base: 5, count: 3, share: 0.6 });
      expect(body.overview.active30d).toEqual({ base: 5, count: 4, share: 0.8 });
      expect(body.overview.returnedAfterWeek).toEqual({ base: 3, count: 2, share: 0.667 });
      expect(body.overview.returnedAfterMonth).toEqual({ base: 3, count: 1, share: 0.333 });
      expect(body.overview.activitySince).toBeNull();
    });

    it('summarises ratings per milestone from 3 answers on, messages as plain counts', async () => {
      const ids = [await user(), await user(), await user()];
      for (const [i, score] of [4, 8, 10].entries()) {
        await t.db.prisma.feedback.create({
          data: { userId: ids[i], milestone: 'day3', score },
        });
      }
      await t.db.prisma.feedback.create({
        data: { userId: users.intruder.userId, milestone: 'day3', score: null },
      });
      await t.db.prisma.feedback.create({ data: { userId: ids[0], milestone: 'week1', score: 9 } });
      await t.db.prisma.feedback.create({
        data: { userId: ids[1], kind: 'idea', comment: 'More colours' },
      });
      // The admin's own rating and message are not counted.
      await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'week1', score: 1 },
      });
      await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, kind: 'problem', comment: 'Test' },
      });
      const { ratings } = await stats();
      expect(ratings.milestones).toEqual([
        {
          milestone: 'day3',
          answered: 3,
          skipped: 1,
          mean: 7.3,
          median: 8,
          low: 1,
          mid: 1,
          high: 1,
        },
        {
          milestone: 'week1',
          answered: 1,
          skipped: 0,
          mean: null,
          median: null,
          low: null,
          mid: null,
          high: null,
        },
        {
          milestone: 'month1',
          answered: 0,
          skipped: 0,
          mean: null,
          median: null,
          low: null,
          mid: null,
          high: null,
        },
        {
          milestone: 'year1',
          answered: 0,
          skipped: 0,
          mean: null,
          median: null,
          low: null,
          mid: null,
          high: null,
        },
      ]);
      expect(ratings.messagesByKind).toEqual([
        { key: 'idea', count: 1 },
        { key: 'problem', count: 0 },
        { key: 'other', count: 0 },
      ]);
      expect(ratings.messagesByStatus.find(({ key }) => key === FEEDBACK_STATUS.Received)).toEqual({
        key: 'received',
        count: 1,
      });
    });
  });

  describe('activity tracking start', () => {
    it('answers the day the activity migration was applied when Prisma recorded it', async () => {
      await t.db.prisma.$executeRaw`CREATE TABLE _prisma_migrations (
        migration_name text NOT NULL, finished_at timestamptz)`;
      try {
        await t.db.prisma.$executeRaw`INSERT INTO _prisma_migrations VALUES
          ('20261121120000_user_last_active_on', '2026-11-20T23:30:00Z'),
          ('20261120120000_ukrainian_language', '2026-11-01T10:00:00Z')`;
        expect((await stats()).overview.activitySince).toBe('2026-11-20');
      } finally {
        await t.db.prisma.$executeRaw`DROP TABLE _prisma_migrations`;
      }
    });
  });

  describe('activity day', () => {
    it('records today on an authenticated request of a regular user, never of a demo user', async () => {
      const intruder = asUser(t.app, users.intruder);
      await t.db.prisma.user.update({
        where: { id: users.intruder.userId },
        data: { lastActiveOn: null },
      });
      await intruder.get('/api/folders').expect(200);
      await vi.waitFor(async () => {
        const row = await t.db.prisma.user.findUniqueOrThrow({
          where: { id: users.intruder.userId },
          select: { lastActiveOn: true },
        });
        expect(row.lastActiveOn?.toISOString().slice(0, 10)).toBe(
          new Date().toISOString().slice(0, 10),
        );
      });

      const demo = await signInDemo(t.app, t.baseUrl);
      await asUser(t.app, demo).get('/api/folders').expect(200);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const demoRow = await t.db.prisma.user.findUniqueOrThrow({
        where: { id: demo.userId },
        select: { lastActiveOn: true },
      });
      expect(demoRow.lastActiveOn).toBeNull();
    });
  });
});
