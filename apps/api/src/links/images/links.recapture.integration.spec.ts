import {
  LINK_IMAGE_PENDING_VERSION,
  LINK_IMAGES_ENDPOINT,
  type LinkResponse,
} from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../../test-utils/reset-rate-limits';
import type { SafeImageResult } from '../../fetcher/models/safe-image-result.interface';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { RECAPTURE_COOLDOWN_MS } from './models/recapture-limits.const';
import { solidPng } from './test-images';

const BASE = '/api/links';
const NEW_PAGE = 'https://other.test/page';
const PAGE_HTML =
  '<html><head><title>T</title><meta property="og:image" content="/cover.png"><link rel="icon" href="/i.png"></head></html>';
const HASHED = (id: string, segment: string): RegExp =>
  new RegExp(`^${BASE}/${id}/${segment}\\?v=[0-9a-f]{16}$`);
const captureUrl = (id: string): string => LINK_IMAGES_ENDPOINT.Capture.replace(':id', id);

describe('POST /api/links/:id/images/capture (ADR 0027 note, #189)', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  const fetchImage = vi.fn<SafeFetcherService['fetchImage']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  let png: Buffer;

  const imageResult = (): SafeImageResult => ({
    finalUrl: 'https://other.test/cover.png',
    status: 200,
    contentType: 'image/png',
    bytes: png,
  });
  const page = (): Awaited<ReturnType<SafeFetcherService['fetch']>> => ({
    finalUrl: NEW_PAGE,
    status: 200,
    contentType: 'text/html',
    body: PAGE_HTML,
  });

  beforeAll(async () => {
    png = await solidPng(800, 600);
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch, fetchImage } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockImplementation(async () => page());
    fetchImage.mockReset();
    fetchImage.mockImplementation(async () => imageResult());
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

  /** A link with a captured image whose URL then changed: pending, no images, no hints. */
  const changedLink = async (agent: TestAgent): Promise<LinkResponse> => {
    const link = (
      await agent
        .post(BASE)
        .send({ url: 'https://site.test/page', title: 'Page', imageUrl: 'https://img.test/c.png' })
        .expect(201)
    ).body as LinkResponse;
    const moved = (await agent.patch(`${BASE}/${link.id}`).send({ url: NEW_PAGE }).expect(200))
      .body as LinkResponse;
    fetch.mockClear();
    fetchImage.mockClear();
    return moved;
  };

  const capture = (agent: TestAgent, id: string): ReturnType<TestAgent['post']> =>
    agent.post(captureUrl(id));

  const attemptedAt = async (id: string): Promise<Date | null> =>
    (await t.db.prisma.link.findUniqueOrThrow({ where: { id } })).captureAttemptedAt;

  it('marks a link pending only when its page really changed', async () => {
    const link = await changedLink(a);
    expect(link.imageUrl).toBe(`${BASE}/${link.id}/image?v=${LINK_IMAGE_PENDING_VERSION}`);
    expect(link.faviconUrl).toBe(`${BASE}/${link.id}/favicon?v=${LINK_IMAGE_PENDING_VERSION}`);
    expect(await attemptedAt(link.id)).toBeNull();

    const plain = (
      await a
        .post(BASE)
        .send({ url: 'https://plain.test/', title: 'Plain', imageUrl: 'https://img.test/c.png' })
        .expect(201)
    ).body as LinkResponse;
    const same = (
      await a.patch(`${BASE}/${plain.id}`).send({ url: 'https://PLAIN.test/' }).expect(200)
    ).body as LinkResponse;
    expect(same.imageUrl).toBe(plain.imageUrl);
    expect(await attemptedAt(plain.id)).not.toBeNull();
  });

  it('claims, loads the new page, stores both kinds and answers with the fresh link', async () => {
    const link = await changedLink(a);
    const before = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    const res = await capture(a, link.id).expect(200);
    const body = res.body as LinkResponse;
    expect(body.id).toBe(link.id);
    expect(body.imageUrl).toMatch(HASHED(link.id, 'image'));
    expect(body.faviconUrl).toMatch(HASHED(link.id, 'favicon'));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(NEW_PAGE);
    expect(fetchImage.mock.calls.map((call) => call[0]).sort()).toEqual([
      'https://other.test/cover.png',
      'https://other.test/i.png',
    ]);
    expect(await t.db.prisma.linkImage.count({ where: { linkId: link.id } })).toBe(2);

    // A capture is not an edit.
    const after = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after.captureAttemptedAt).not.toBeNull();

    const got = (await a.get(`${BASE}/${link.id}`).expect(200)).body as LinkResponse;
    expect(got.imageUrl).toBe(body.imageUrl);
    await a.get(body.imageUrl ?? '').expect(200);
    await a.get(body.faviconUrl ?? '').expect(200);
  });

  it('runs one capture for concurrent calls and answers 200 to all (stampede guard)', async () => {
    const link = await changedLink(a);
    const results = await Promise.all([
      capture(a, link.id),
      capture(a, link.id),
      capture(a, link.id),
    ]);
    expect(results.map((res) => res.status)).toEqual([200, 200, 200]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchImage).toHaveBeenCalledTimes(2);
    expect(await t.db.prisma.linkImage.count({ where: { linkId: link.id } })).toBe(2);
  });

  it('does not retry within the cooldown, and retries after it', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    const link = await changedLink(a);
    const first = (await capture(a, link.id).expect(200)).body as LinkResponse;
    // The failed attempt took the claim: no pending marker any more, no image.
    expect(first).toMatchObject({ imageUrl: null, faviconUrl: null });
    await capture(a, link.id).expect(200);
    expect(fetch).toHaveBeenCalledTimes(1);

    await t.db.prisma.$executeRaw`
      UPDATE links SET capture_attempted_at = now() - ${`${RECAPTURE_COOLDOWN_MS + 1000} milliseconds`}::interval
      WHERE id = ${link.id}::uuid`;
    fetch.mockImplementation(async () => page());
    const again = (await capture(a, link.id).expect(200)).body as LinkResponse;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(again.imageUrl).toMatch(HASHED(link.id, 'image'));
  });

  it('uses stored hints without loading the page', async () => {
    const link = await changedLink(a);
    await t.db.prisma.link.update({
      where: { id: link.id },
      data: { imageSourceUrl: 'https://other.test/hint.png' },
    });
    await capture(a, link.id).expect(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchImage).toHaveBeenCalledWith('https://other.test/hint.png', expect.anything());
  });

  it('drops what a capture wrote when the URL changed again meanwhile', async () => {
    const link = await changedLink(a);
    fetchImage.mockImplementation(async () => {
      await a.patch(`${BASE}/${link.id}`).send({ url: 'https://third.test/' }).expect(200);
      return imageResult();
    });
    const body = (await capture(a, link.id).expect(200)).body as LinkResponse;
    expect(await t.db.prisma.linkImage.count({ where: { linkId: link.id } })).toBe(0);
    // The second PATCH marked the link pending again, and the answer says so.
    expect(await attemptedAt(link.id)).toBeNull();
    expect(body.imageUrl).toBe(`${BASE}/${link.id}/image?v=${LINK_IMAGE_PENDING_VERSION}`);
  });

  it('is a 404 for a foreign or missing link and never claims or fetches', async () => {
    const link = await changedLink(a);
    await capture(b, link.id).expect(404);
    await capture(b, '00000000-0000-4000-8000-000000000000').expect(404);
    await b.post(`${BASE}/not-a-uuid/images/capture`).expect(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchImage).not.toHaveBeenCalled();
    expect(await attemptedAt(link.id)).toBeNull();
    expect(await t.db.prisma.linkImage.count()).toBe(0);
  });

  it('keeps GET a pure read: a miss never claims or fetches', async () => {
    const link = await changedLink(a);
    await a.get(`${BASE}/${link.id}/image`).expect(404);
    await a.get(`${BASE}/${link.id}/favicon`).expect(404);
    await a.get(`${BASE}/${link.id}`).expect(200);
    await a.get(BASE).expect(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchImage).not.toHaveBeenCalled();
    expect(await attemptedAt(link.id)).toBeNull();
  });

  it('requires a session and rejects a foreign Origin before doing anything', async () => {
    const link = await changedLink(a);
    await anonymous(t.app).post(captureUrl(link.id)).expect(401);
    const res = await a.post(captureUrl(link.id)).set('Origin', 'https://evil.test');
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    expect(await attemptedAt(link.id)).toBeNull();
  });

  it('is rate limited like create (429 after 30 calls a minute)', async () => {
    const link = await changedLink(a);
    for (let i = 0; i < 30; i++) await capture(a, link.id).expect(200);
    const res = await capture(a, link.id).expect(429);
    expect(res.body).toMatchObject({ statusCode: 429 });
    // The claim held across all of them.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('data isolation: a foreign link is a plain 404, like a missing one', async () => {
    await expectIsolated(t.app, users, {
      create: async (owner) => (await changedLink(owner)).id,
      read: (agent, id) => capture(agent, id),
      skip: {
        update: 'covered by the links scenario',
        remove: 'covered by the links scenario',
        list: 'there is no image list',
        reference: 'the endpoint takes only the link id, nothing references another resource',
      },
    });
  });
});
