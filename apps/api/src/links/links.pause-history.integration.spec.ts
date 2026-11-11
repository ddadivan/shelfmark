import {
  USER_SETTINGS_ENDPOINT,
  type OpenLinkResponse,
  type RecentLinksResponse,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';

const BASE = '/api/links';
const EARLIER = new Date('2026-11-01T10:00:00.000Z');

describe('pause history (#269)', () => {
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

  const lastOpenedAt = async (id: string): Promise<Date | null> =>
    (await t.db.prisma.link.findUniqueOrThrow({ where: { id } })).lastOpenedAt;

  const recentIds = async (agent: ReturnType<typeof asUser>): Promise<string[]> =>
    ((await agent.get(`${BASE}/recent`).expect(200)).body as RecentLinksResponse).items.map(
      (link) => link.id,
    );

  it('is off by default and stored on the account', async () => {
    const a = asUser(t.app, users.owner);
    const read = (await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse;
    expect(read.pauseHistory).toBe(false);
    const on = await a.patch(USER_SETTINGS_ENDPOINT).send({ pauseHistory: true }).expect(200);
    expect((on.body as UserSettingsResponse).pauseHistory).toBe(true);
    const row = await t.db.prisma.user.findUniqueOrThrow({ where: { id: users.owner.userId } });
    expect(row.historyPaused).toBe(true);
    expect(
      ((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse).pauseHistory,
    ).toBe(true);
  });

  it('records opens while not paused', async () => {
    const a = asUser(t.app, users.owner);
    const id = await seedLink(t.db.prisma, users.owner.userId);
    const opened = (await a.post(`${BASE}/${id}/open`).expect(200)).body as OpenLinkResponse;
    expect(opened.recorded).toBe(true);
    expect(opened.lastOpenedAt).not.toBeNull();
    expect(await lastOpenedAt(id)).not.toBeNull();
    expect(await recentIds(a)).toEqual([id]);
  });

  it('does not record opens while paused, and records them again after resuming', async () => {
    const a = asUser(t.app, users.owner);
    const fresh = await seedLink(t.db.prisma, users.owner.userId);
    const earlier = await seedLink(t.db.prisma, users.owner.userId, { lastOpenedAt: EARLIER });
    await a.patch(USER_SETTINGS_ENDPOINT).send({ pauseHistory: true }).expect(200);

    const first = (await a.post(`${BASE}/${fresh}/open`).expect(200)).body as OpenLinkResponse;
    expect(first.recorded).toBe(false);
    expect(first.lastOpenedAt).toBeNull();
    expect(await lastOpenedAt(fresh)).toBeNull();

    // An earlier open keeps its time: pausing does not move or clear the history.
    const second = (await a.post(`${BASE}/${earlier}/open`).expect(200)).body as OpenLinkResponse;
    expect(second.recorded).toBe(false);
    expect(second.lastOpenedAt).toBe(EARLIER.toISOString());
    expect(await lastOpenedAt(earlier)).toEqual(EARLIER);
    expect(await recentIds(a)).toEqual([earlier]);

    await a.patch(USER_SETTINGS_ENDPOINT).send({ pauseHistory: false }).expect(200);
    const resumed = (await a.post(`${BASE}/${fresh}/open`).expect(200)).body as OpenLinkResponse;
    expect(resumed.recorded).toBe(true);
    expect(await lastOpenedAt(fresh)).not.toBeNull();
    expect(await recentIds(a)).toEqual([fresh, earlier]);
  });

  it('still answers 404 for a foreign or missing link while paused', async () => {
    const a = asUser(t.app, users.owner);
    const b = asUser(t.app, users.intruder);
    const id = await seedLink(t.db.prisma, users.owner.userId);
    await b.patch(USER_SETTINGS_ENDPOINT).send({ pauseHistory: true }).expect(200);
    await b.post(`${BASE}/${id}/open`).expect(404);
    await b.post(`${BASE}/018f0000-0000-7000-8000-00000000dead/open`).expect(404);
    expect(await lastOpenedAt(id)).toBeNull();
    await a.post(`${BASE}/${id}/open`).expect(200);
  });

  it("is isolated: B's pause does not affect A, and A's pause does not affect B", async () => {
    const a = asUser(t.app, users.owner);
    const b = asUser(t.app, users.intruder);
    const own = await seedLink(t.db.prisma, users.owner.userId);
    const theirs = await seedLink(t.db.prisma, users.intruder.userId);

    await b.patch(USER_SETTINGS_ENDPOINT).send({ pauseHistory: true }).expect(200);
    expect(
      ((await a.get(USER_SETTINGS_ENDPOINT).expect(200)).body as UserSettingsResponse).pauseHistory,
    ).toBe(false);
    expect(
      ((await a.post(`${BASE}/${own}/open`).expect(200)).body as OpenLinkResponse).recorded,
    ).toBe(true);
    expect(
      ((await b.post(`${BASE}/${theirs}/open`).expect(200)).body as OpenLinkResponse).recorded,
    ).toBe(false);
    expect(await lastOpenedAt(own)).not.toBeNull();
    expect(await lastOpenedAt(theirs)).toBeNull();
  });

  it.each([['true'], [null], [0], [1], [[true]]])(
    'rejects pauseHistory %j with 400 and changes nothing',
    async (value) => {
      const a = asUser(t.app, users.owner);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ pauseHistory: value }).expect(400);
      const row = await t.db.prisma.user.findUniqueOrThrow({ where: { id: users.owner.userId } });
      expect(row.historyPaused).toBe(false);
    },
  );

  it('rejects the column name as an unknown field', async () => {
    const a = asUser(t.app, users.owner);
    await a.patch(USER_SETTINGS_ENDPOINT).send({ historyPaused: true }).expect(400);
  });
});
