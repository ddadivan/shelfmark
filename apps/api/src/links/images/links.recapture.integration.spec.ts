import { LINK_IMAGE_KIND, type LinkResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../../test-utils/isolation/expect-isolated';
import { asUser } from '../../../test-utils/isolation/test-agent';
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

describe('lazy image re-capture after a URL change (ADR 0027 note, #189)', () => {
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

  beforeAll(async () => {
    png = await solidPng(800, 600);
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch, fetchImage } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockResolvedValue({
      finalUrl: NEW_PAGE,
      status: 200,
      contentType: 'text/html',
      body: PAGE_HTML,
    });
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

  const attemptedAt = async (id: string): Promise<Date | null> =>
    (await t.db.prisma.link.findUniqueOrThrow({ where: { id } })).captureAttemptedAt;

  it('marks a link pending only when its page really changed', async () => {
    const link = await changedLink(a);
    expect(link.imageUrl).toBe(`${BASE}/${link.id}/image?v=pending`);
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

  it('captures on the first miss from the new page and serves the image', async () => {
    const link = await changedLink(a);
    const before = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    const res = await a.get(`${BASE}/${link.id}/image`).expect(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(NEW_PAGE);
    expect(fetchImage.mock.calls.map((call) => call[0]).sort()).toEqual([
      'https://other.test/cover.png',
      'https://other.test/i.png',
    ]);

    const got = (await a.get(`${BASE}/${link.id}`).expect(200)).body as LinkResponse;
    expect(got.imageUrl).toMatch(new RegExp(`^${BASE}/${link.id}/image\\?v=[0-9a-f]{16}$`));
    expect(got.faviconUrl).toMatch(new RegExp(`^${BASE}/${link.id}/favicon\\?v=[0-9a-f]{16}$`));
    // A capture is not an edit.
    const after = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(after.captureAttemptedAt).not.toBeNull();
    await a.get(`${BASE}/${link.id}/favicon`).expect(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('runs one capture for concurrent image requests (stampede guard)', async () => {
    const link = await changedLink(a);
    const results = await Promise.all([
      a.get(`${BASE}/${link.id}/image`),
      a.get(`${BASE}/${link.id}/favicon`),
      a.get(`${BASE}/${link.id}/image`),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchImage).toHaveBeenCalledTimes(2);
    // Whoever lost the claim saw a miss before the winner stored; nobody got a server error.
    expect(results.every((res) => res.status === 200 || res.status === 404)).toBe(true);
    expect(results.some((res) => res.status === 200)).toBe(true);
  });

  it('does not retry within the cooldown, and retries after it', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    const link = await changedLink(a);
    fetch.mockClear();
    await a.get(`${BASE}/${link.id}/image`).expect(404);
    await a.get(`${BASE}/${link.id}/image`).expect(404);
    await a.get(`${BASE}/${link.id}/favicon`).expect(404);
    expect(fetch).toHaveBeenCalledTimes(1);
    // The failed attempt took the claim, so the card stops asking: no pending path any more.
    const got = (await a.get(`${BASE}/${link.id}`).expect(200)).body as LinkResponse;
    expect(got).toMatchObject({ imageUrl: null, faviconUrl: null });

    await t.db.prisma.$executeRaw`
      UPDATE links SET capture_attempted_at = now() - ${`${RECAPTURE_COOLDOWN_MS + 1000} milliseconds`}::interval
      WHERE id = ${link.id}::uuid`;
    fetch.mockResolvedValue({
      finalUrl: NEW_PAGE,
      status: 200,
      contentType: 'text/html',
      body: PAGE_HTML,
    });
    await a.get(`${BASE}/${link.id}/image`).expect(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('uses stored hints without loading the page', async () => {
    const link = await changedLink(a);
    await t.db.prisma.link.update({
      where: { id: link.id },
      data: { imageSourceUrl: 'https://other.test/hint.png' },
    });
    await a.get(`${BASE}/${link.id}/image`).expect(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchImage).toHaveBeenCalledWith('https://other.test/hint.png', expect.anything());
  });

  it('drops what a capture wrote when the URL changed again meanwhile', async () => {
    const link = await changedLink(a);
    fetchImage.mockImplementation(async () => {
      await a.patch(`${BASE}/${link.id}`).send({ url: 'https://third.test/' }).expect(200);
      return imageResult();
    });
    await a.get(`${BASE}/${link.id}/image`).expect(404);
    expect(await t.db.prisma.linkImage.count({ where: { linkId: link.id } })).toBe(0);
    // The second PATCH marked the link pending again.
    expect(await attemptedAt(link.id)).toBeNull();
  });

  it('never captures for a foreign or missing link', async () => {
    const link = await changedLink(a);
    await b.get(`${BASE}/${link.id}/image`).expect(404);
    await b.get(`${BASE}/${link.id}/favicon`).expect(404);
    await b.get(`${BASE}/00000000-0000-4000-8000-000000000000/image`).expect(404);
    expect(fetch).not.toHaveBeenCalled();
    expect(fetchImage).not.toHaveBeenCalled();
    expect(await attemptedAt(link.id)).toBeNull();
    expect(await t.db.prisma.linkImage.count()).toBe(0);
  });

  it('data isolation: a foreign pending link stays a plain 404', async () => {
    for (const kind of [LINK_IMAGE_KIND.Preview, LINK_IMAGE_KIND.Favicon]) {
      const segment = kind === LINK_IMAGE_KIND.Preview ? 'image' : 'favicon';
      await expectIsolated(t.app, users, {
        create: async (owner) => (await changedLink(owner)).id,
        read: (agent, id) => agent.get(`${BASE}/${id}/${segment}`),
        skip: {
          update: 'covered by the links scenario',
          remove: 'covered by the links scenario',
          list: 'there is no image list',
          reference: 'images are not referenced by other resources',
        },
      });
    }
  });
});
