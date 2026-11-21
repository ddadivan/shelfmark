import {
  LINK_FRAMING,
  USER_LIMIT,
  type LinkFrameCheckResponse,
  type UserSettingsResponse,
} from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import type { SafeHeadersResult } from '../fetcher/models/safe-headers-result.interface';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { FRAME_CHECK_FETCH_LIMITS } from './frame-check/models/frame-check-fetch-limits.const';
import { FRAME_CHECK_TTL_MS } from './frame-check/models/frame-check-ttl.const';

const HOST = 'frames.test';
const URL_ON_HOST = `https://${HOST}/article`;
const SETTINGS = '/api/me/settings';
const HOUR_MS = 60 * 60 * 1000;

const page = (
  headers: Partial<SafeHeadersResult['headers']> = {},
  status = 200,
): SafeHeadersResult => ({
  finalUrl: URL_ON_HOST,
  status,
  headers: { xFrameOptions: null, contentSecurityPolicy: null, ...headers },
});

describe('POST /api/links/:id/frame-check', () => {
  const fetchHeaders = vi.fn<SafeFetcherService['fetchHeaders']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetchHeaders } }],
    });
  });

  beforeEach(async () => {
    fetchHeaders.mockReset();
    fetchHeaders.mockResolvedValue(page());
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

  const path = (id: string): string => `/api/links/${id}/frame-check`;
  const check = async (agent: TestAgent, id: string): Promise<LinkFrameCheckResponse> =>
    (await agent.post(path(id)).expect(200)).body as LinkFrameCheckResponse;
  const hostsOf = async (userId: string): Promise<string[]> =>
    (await t.db.prisma.user.findUniqueOrThrow({ where: { id: userId } })).previewNewTabHosts;
  const link = (url = URL_ON_HOST): Promise<string> =>
    seedLink(t.db.prisma, users.owner.userId, { url });

  it('answers allowed for a page with no framing headers and caches the host', async () => {
    const id = await link();
    const body = await check(a, id);
    expect(body).toEqual({
      linkId: id,
      host: HOST,
      framing: LINK_FRAMING.Allowed,
      checkedAt: expect.any(String),
      addedToNewTabHosts: false,
    });
    expect(fetchHeaders).toHaveBeenCalledWith(URL_ON_HOST, FRAME_CHECK_FETCH_LIMITS);
    const row = await t.db.prisma.frameCheck.findUniqueOrThrow({ where: { host: HOST } });
    expect(row.framing).toBe(LINK_FRAMING.Allowed);
    expect(body.checkedAt).toBe(row.checkedAt.toISOString());
    expect(await hostsOf(users.owner.userId)).toEqual([]);
  });

  it('serves a fresh cache row without any request, for every user', async () => {
    const id = await link();
    await check(a, id);
    await check(a, id);
    const mine = await seedLink(t.db.prisma, users.intruder.userId, { url: `${URL_ON_HOST}/2` });
    await check(b, mine);
    expect(fetchHeaders).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['allowed', 7 * 24 * HOUR_MS],
    ['blocked', 7 * 24 * HOUR_MS],
    ['unknown', HOUR_MS],
  ] as const)('asks again once a %s row is past its TTL', async (framing, ttl) => {
    const id = await link();
    const checkedAt = new Date(Date.now() - ttl - 1_000);
    await t.db.prisma.frameCheck.create({ data: { host: HOST, framing, checkedAt } });
    expect(FRAME_CHECK_TTL_MS[framing]).toBe(ttl);
    await check(a, id);
    expect(fetchHeaders).toHaveBeenCalledTimes(1);
    const row = await t.db.prisma.frameCheck.findUniqueOrThrow({ where: { host: HOST } });
    expect(row.checkedAt.getTime()).toBeGreaterThan(checkedAt.getTime());
  });

  it('keeps a row just inside its TTL', async () => {
    const id = await link();
    const checkedAt = new Date(Date.now() - 7 * 24 * HOUR_MS + 60_000);
    await t.db.prisma.frameCheck.create({
      data: { host: HOST, framing: LINK_FRAMING.Blocked, checkedAt },
    });
    const body = await check(a, id);
    expect(body.framing).toBe(LINK_FRAMING.Blocked);
    expect(body.checkedAt).toBe(checkedAt.toISOString());
    expect(fetchHeaders).not.toHaveBeenCalled();
  });

  it('asks again for a cached row with a framing it does not know', async () => {
    const id = await link();
    await t.db.prisma
      .$executeRaw`ALTER TABLE frame_checks DROP CONSTRAINT frame_checks_framing_check`;
    await t.db.prisma.frameCheck.create({
      data: { host: HOST, framing: 'weird', checkedAt: new Date() },
    });
    expect((await check(a, id)).framing).toBe(LINK_FRAMING.Allowed);
    expect(fetchHeaders).toHaveBeenCalledTimes(1);
  });

  describe('a blocked host', () => {
    it.each([
      ['X-Frame-Options', { xFrameOptions: 'SAMEORIGIN' }],
      ['CSP frame-ancestors', { contentSecurityPolicy: "frame-ancestors 'none'" }],
    ])('is added to the new-tab sites (%s)', async (_name, headers) => {
      fetchHeaders.mockResolvedValue(page(headers));
      const id = await link();
      const body = await check(a, id);
      expect(body.framing).toBe(LINK_FRAMING.Blocked);
      expect(body.addedToNewTabHosts).toBe(true);
      expect(await hostsOf(users.owner.userId)).toEqual([HOST]);
      const settings = (await a.get(SETTINGS).expect(200)).body as UserSettingsResponse;
      expect(settings.previewNewTabHosts).toEqual([HOST]);
      // Another user's list is untouched.
      expect(await hostsOf(users.intruder.userId)).toEqual([]);
    });

    it('is added once: a repeat (also from the cache) says false and keeps one entry', async () => {
      fetchHeaders.mockResolvedValue(page({ xFrameOptions: 'DENY' }));
      const id = await link();
      expect((await check(a, id)).addedToNewTabHosts).toBe(true);
      expect((await check(a, id)).addedToNewTabHosts).toBe(false);
      expect(await hostsOf(users.owner.userId)).toEqual([HOST]);
    });

    it('is not added again from the cache once the user removed it', async () => {
      fetchHeaders.mockResolvedValue(page({ xFrameOptions: 'DENY' }));
      const id = await link();
      expect((await check(a, id)).addedToNewTabHosts).toBe(true);
      await a.patch(SETTINGS).send({ previewNewTabHosts: [] }).expect(200);
      const again = await check(a, id);
      expect(again.framing).toBe(LINK_FRAMING.Blocked);
      expect(again.addedToNewTabHosts).toBe(false);
      expect(await hostsOf(users.owner.userId)).toEqual([]);
    });

    it('a redirect to another site answers but caches nothing and adds nothing', async () => {
      fetchHeaders.mockResolvedValue({
        ...page({ xFrameOptions: 'DENY' }),
        finalUrl: 'https://elsewhere.test/landing',
      });
      const id = await link();
      const body = await check(a, id);
      expect(body.framing).toBe(LINK_FRAMING.Blocked);
      expect(body.addedToNewTabHosts).toBe(false);
      expect(await t.db.prisma.frameCheck.findUnique({ where: { host: HOST } })).toBeNull();
      expect(await hostsOf(users.owner.userId)).toEqual([]);
    });

    it('a redirect within the site (www.) is cached for the host', async () => {
      fetchHeaders.mockResolvedValue({
        ...page({ xFrameOptions: 'DENY' }),
        finalUrl: `https://www.${HOST}/article`,
      });
      const id = await link();
      expect((await check(a, id)).addedToNewTabHosts).toBe(true);
      expect(await t.db.prisma.frameCheck.findUnique({ where: { host: HOST } })).not.toBeNull();
    });

    it('is added behind older entries, keeping the order', async () => {
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { previewNewTabHosts: ['old.example.com'] },
      });
      fetchHeaders.mockResolvedValue(page({ xFrameOptions: 'DENY' }));
      await check(a, await link());
      expect(await hostsOf(users.owner.userId)).toEqual(['old.example.com', HOST]);
    });

    it('is not added when the list is full, and the answer says so', async () => {
      const full = Array.from(
        { length: USER_LIMIT.PreviewNewTabHostsMax },
        (_, i) => `h${i}.example.com`,
      );
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { previewNewTabHosts: full },
      });
      fetchHeaders.mockResolvedValue(page({ xFrameOptions: 'DENY' }));
      const body = await check(a, await link());
      expect(body.framing).toBe(LINK_FRAMING.Blocked);
      expect(body.addedToNewTabHosts).toBe(false);
      expect(await hostsOf(users.owner.userId)).toEqual(full);
    });

    it('is added exactly once under concurrent calls', async () => {
      fetchHeaders.mockResolvedValue(page({ xFrameOptions: 'DENY' }));
      const ids = await Promise.all([link(`${URL_ON_HOST}/1`), link(`${URL_ON_HOST}/2`)]);
      const bodies = await Promise.all(ids.map((id) => check(a, id)));
      expect(bodies.filter((body) => body.addedToNewTabHosts)).toHaveLength(1);
      expect(await hostsOf(users.owner.userId)).toEqual([HOST]);
    });

    it('is not added for an allowed host', async () => {
      expect((await check(a, await link())).addedToNewTabHosts).toBe(false);
      expect(await hostsOf(users.owner.userId)).toEqual([]);
    });
  });

  describe('unknown', () => {
    it('is the answer to a fetch error, cached as unknown', async () => {
      fetchHeaders.mockRejectedValue(
        new SafeFetchError(SAFE_FETCH_ERROR_CODE.BlockedAddress, 'Host is not allowed'),
      );
      const id = await link();
      const body = await check(a, id);
      expect(body.framing).toBe(LINK_FRAMING.Unknown);
      expect(body.addedToNewTabHosts).toBe(false);
      await check(a, id);
      expect(fetchHeaders).toHaveBeenCalledTimes(1);
      expect(
        (await t.db.prisma.frameCheck.findUniqueOrThrow({ where: { host: HOST } })).framing,
      ).toBe(LINK_FRAMING.Unknown);
    });

    it.each([301, 403, 404, 500])('is the answer to the status %i', async (status) => {
      fetchHeaders.mockResolvedValue(page({ xFrameOptions: 'DENY' }, status));
      const body = await check(a, await link());
      expect(body.framing).toBe(LINK_FRAMING.Unknown);
      expect(body.addedToNewTabHosts).toBe(false);
    });
  });

  it('answers blocked for a plain http link without any request or cache row', async () => {
    const id = await link('http://insecure.test/page');
    const body = await check(a, id);
    expect(body).toMatchObject({
      linkId: id,
      host: 'insecure.test',
      framing: LINK_FRAMING.Blocked,
      addedToNewTabHosts: false,
    });
    expect(fetchHeaders).not.toHaveBeenCalled();
    expect(await t.db.prisma.frameCheck.count()).toBe(0);
    expect(await hostsOf(users.owner.userId)).toEqual([]);
  });

  it('is a 404 for a trashed link and a 400 for a malformed id', async () => {
    const id = await link();
    await a.delete(`/api/links/${id}`).expect(204);
    await a.post(path(id)).expect(404);
    await a.post(path('not-a-uuid')).expect(400);
    expect(fetchHeaders).not.toHaveBeenCalled();
  });

  it('needs a session', async () => {
    const id = await link();
    await anonymous(t.app).post(path(id)).expect(401);
    expect(fetchHeaders).not.toHaveBeenCalled();
  });

  it('is rate limited', async () => {
    const id = await link();
    for (let i = 0; i < 60; i++) await a.post(path(id)).expect(200);
    await a.post(path(id)).expect(429);
  });

  it('is isolated: a foreign link is a 404 that looks like a missing one and fetches nothing', async () => {
    await expectIsolated(t.app, users, {
      create: (owner) => {
        void owner;
        return link();
      },
      read: (agent, id) => agent.post(path(id)),
      skip: {
        update: 'frame-check has no update; it only reads the link and a shared host cache',
        remove: 'frame-check has no delete',
        list: 'frame-check is not a list',
        reference: 'frame-check is not referenced by another resource',
      },
    });
    // The intruder's attempts never reached the fetcher; only the owner's "still intact" read did.
    expect(fetchHeaders.mock.calls.length).toBeLessThanOrEqual(1);
    expect(await hostsOf(users.intruder.userId)).toEqual([]);
  });
});
