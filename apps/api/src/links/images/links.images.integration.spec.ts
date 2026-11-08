import { randomUUID } from 'node:crypto';
import { LINK_IMAGE_KIND, type LinkResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../../test-utils/isolation/expect-isolated';
import { anonymous, asUser } from '../../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../../test-utils/reset-rate-limits';
import { SAFE_FETCH_ERROR_CODE } from '../../fetcher/models/safe-fetch-error-code.const';
import type { SafeImageResult } from '../../fetcher/models/safe-image-result.interface';
import { SafeFetchError } from '../../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { LinkImageCaptureService } from './link-image-capture.service';
import { noisePng, solidPng } from './test-images';

const BASE = '/api/links';
const IMAGE_URL = 'https://img.test/cover.png';
const FAVICON_URL = 'https://img.test/icon.png';
const PATH_PATTERN = (id: string, segment: string): RegExp =>
  new RegExp(`^/api/links/${id}/${segment}\\?v=[0-9a-f]{16}$`);

describe('link images (ADR 0027)', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  const fetchImage = vi.fn<SafeFetcherService['fetchImage']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  let png: Buffer;

  const imageResult = (bytes: Buffer, contentType = 'image/png'): SafeImageResult => ({
    finalUrl: IMAGE_URL,
    status: 200,
    contentType,
    bytes,
  });

  beforeAll(async () => {
    png = await solidPng(800, 600);
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch, fetchImage } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('offline'));
    fetchImage.mockReset();
    fetchImage.mockImplementation(async () => imageResult(png));
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

  const create = async (
    agent: TestAgent,
    extra: Record<string, unknown> = {},
  ): Promise<LinkResponse> =>
    (
      await agent
        .post(BASE)
        .send({
          url: 'https://site.test/page',
          title: 'Page',
          imageUrl: IMAGE_URL,
          faviconUrl: FAVICON_URL,
          ...extra,
        })
        .expect(201)
    ).body as LinkResponse;

  it('captures both images on create and answers with same-origin paths', async () => {
    const link = await create(a);
    expect(link.imageUrl).toMatch(PATH_PATTERN(link.id, 'image'));
    expect(link.faviconUrl).toMatch(PATH_PATTERN(link.id, 'favicon'));
    expect(fetchImage).toHaveBeenCalledTimes(2);
    expect(fetchImage).toHaveBeenCalledWith(
      IMAGE_URL,
      expect.objectContaining({ totalTimeoutMs: expect.any(Number) }),
    );
    const { totalTimeoutMs } = fetchImage.mock.calls[0]?.[1] ?? {};
    expect(totalTimeoutMs).toBeLessThanOrEqual(5_000);

    const got = (await a.get(`${BASE}/${link.id}`).expect(200)).body as LinkResponse;
    expect(got.imageUrl).toBe(link.imageUrl);
    const listed = (await a.get(BASE).expect(200)).body as { items: LinkResponse[] };
    expect(listed.items[0]?.faviconUrl).toBe(link.faviconUrl);
  });

  it('serves the re-encoded image with the headers of ADR 0027', async () => {
    const link = await create(a);
    const res = await a.get(link.imageUrl ?? '').expect(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(res.headers['content-disposition']).toBe('inline');
    expect(res.headers['cache-control']).toBe('private, max-age=31536000, immutable');
    expect(res.headers['vary']).toContain('Cookie');
    const body = res.body as Buffer;
    expect(body.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(body.subarray(8, 12).toString('latin1')).toBe('WEBP');
    expect(body.equals(png)).toBe(false);
    expect(body.length).toBeLessThanOrEqual(64 * 1024);

    const etag = res.headers['etag'];
    expect(etag).toBeDefined();
    await a
      .get(link.imageUrl ?? '')
      .set('If-None-Match', etag ?? '')
      .expect(304);

    const favicon = await a.get(link.faviconUrl ?? '').expect(200);
    expect(favicon.headers['content-type']).toBe('image/webp');
    expect((favicon.body as Buffer).length).toBeLessThanOrEqual(8 * 1024);
  });

  it('stores nothing but the re-encoded copy, owned by the user', async () => {
    const link = await create(a);
    const rows = await t.db.prisma.linkImage.findMany({ where: { linkId: link.id } });
    expect(rows.map((row) => row.kind).sort()).toEqual([
      LINK_IMAGE_KIND.Favicon,
      LINK_IMAGE_KIND.Preview,
    ]);
    for (const row of rows) {
      expect(row.userId).toBe(users.owner.userId);
      expect(row.contentType).toBe('image/webp');
      expect(Buffer.from(row.bytes).equals(png)).toBe(false);
    }
  });

  it('uses the image URLs found on the page when the request has none', async () => {
    fetch.mockResolvedValue({
      finalUrl: 'https://site.test/final',
      status: 200,
      contentType: 'text/html',
      body: '<html><head><title>T</title><meta property="og:image" content="/cover.png"><link rel="icon" href="/i.png"></head></html>',
    });
    const body = (await a.post(BASE).send({ url: 'https://site.test/start' }).expect(201))
      .body as LinkResponse;
    expect(body.imageUrl).not.toBeNull();
    expect(fetchImage.mock.calls.map(([url]) => url).sort()).toEqual([
      'https://site.test/cover.png',
      'https://site.test/i.png',
    ]);
  });

  it('leaves the images null when there is nothing to fetch', async () => {
    const link = (
      await a.post(BASE).send({ url: 'https://site.test/none', title: 'T' }).expect(201)
    ).body as LinkResponse;
    expect(link).toMatchObject({ imageUrl: null, faviconUrl: null });
    expect(fetchImage).not.toHaveBeenCalled();
    await a.get(`${BASE}/${link.id}/image`).expect(404);
    await a.get(`${BASE}/${link.id}/favicon`).expect(404);
  });

  it('still saves the link when a fetch fails, and keeps the image that worked', async () => {
    fetchImage.mockImplementation(async (url) => {
      if (url === IMAGE_URL) {
        throw new SafeFetchError(SAFE_FETCH_ERROR_CODE.BlockedAddress, 'blocked');
      }
      return imageResult(png);
    });
    const link = await create(a);
    expect(link.imageUrl).toBeNull();
    expect(link.faviconUrl).toMatch(PATH_PATTERN(link.id, 'favicon'));
  });

  it.each([
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>')],
    ['HTML', Buffer.from('<html><script>alert(1)</script></html>')],
    ['a broken image', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])],
  ])('stores nothing for %s labelled as an image', async (_label, bytes) => {
    fetchImage.mockImplementation(async () => imageResult(bytes, 'image/png'));
    const link = await create(a);
    expect(link).toMatchObject({ imageUrl: null, faviconUrl: null });
    expect(await t.db.prisma.linkImage.count()).toBe(0);
  });

  it('does not capture on an idempotent replay', async () => {
    const idempotencyKey = randomUUID();
    const first = await create(a, { idempotencyKey });
    fetchImage.mockClear();
    const replay = await a
      .post(BASE)
      .send({ url: 'https://site.test/page', title: 'Page', imageUrl: IMAGE_URL, idempotencyKey })
      .expect(200);
    expect((replay.body as LinkResponse).id).toBe(first.id);
    expect(fetchImage).not.toHaveBeenCalled();
  });

  it('drops the images when the URL changes and keeps them for other edits', async () => {
    const link = await create(a);
    const renamed = (await a.patch(`${BASE}/${link.id}`).send({ title: 'New' }).expect(200))
      .body as LinkResponse;
    expect(renamed.imageUrl).toBe(link.imageUrl);
    const moved = (
      await a.patch(`${BASE}/${link.id}`).send({ url: 'https://other.test/' }).expect(200)
    ).body as LinkResponse;
    expect(moved.imageUrl).toBe(`/api/links/${link.id}/image?v=pending`);
    expect(moved.faviconUrl).toBe(`/api/links/${link.id}/favicon?v=pending`);
    expect(await t.db.prisma.linkImage.count()).toBe(0);
    await a.get(`${BASE}/${link.id}/image`).expect(404);
  });

  it('keeps the images when PATCH writes the same URL, even differently', async () => {
    const link = await create(a);
    const same = (
      await a.patch(`${BASE}/${link.id}`).send({ url: 'https://SITE.test/page' }).expect(200)
    ).body as LinkResponse;
    expect(same.imageUrl).toBe(link.imageUrl);
    expect(same.faviconUrl).toBe(link.faviconUrl);
    expect(await t.db.prisma.linkImage.count()).toBe(2);
    const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
    expect(row.imageSourceUrl).toBe(IMAGE_URL);
  });

  it('removes the images with the link and with the account', async () => {
    const link = await create(a);
    await a.delete(`${BASE}/${link.id}`).expect(204);
    expect(await t.db.prisma.linkImage.count()).toBe(0);

    await create(a);
    await create(b);
    expect(await t.db.prisma.linkImage.count()).toBe(4);
    await t.db.prisma.user.delete({ where: { id: users.owner.userId } });
    const left = await t.db.prisma.linkImage.findMany();
    expect(left).toHaveLength(2);
    expect(left.every((row) => row.userId === users.intruder.userId)).toBe(true);
  });

  it('requires a session and a UUID', async () => {
    const link = await create(a);
    await anonymous(t.app).get(`${BASE}/${link.id}/image`).expect(401);
    await anonymous(t.app).get(`${BASE}/${link.id}/favicon`).expect(401);
    await a.get(`${BASE}/not-a-uuid/image`).expect(400);
  });

  it('data isolation: a foreign image is a 404, like a missing one', async () => {
    for (const segment of ['image', 'favicon']) {
      await expectIsolated(t.app, users, {
        create: async (owner) => (await create(owner)).id,
        read: (agent, id) => agent.get(`${BASE}/${id}/${segment}`),
        skip: {
          update: 'images are written by the server only, there is no endpoint',
          remove: 'images are removed with the link, covered by the links scenario',
          list: 'there is no image list',
          reference: 'images are not referenced by other resources',
        },
      });
      await t.db.truncateAll();
      users = await createIsolationUsers(t);
    }
  });

  it('never serves an image of another user through a guessed id', async () => {
    const mine = await create(a);
    const res = await b.get(`${BASE}/${mine.id}/image`).expect(404);
    expect(JSON.stringify(res.body)).not.toContain('webp');
    expect((res.body as { statusCode: number }).statusCode).toBe(404);
  });

  describe('LinkImageCaptureService', () => {
    it('skips the capture when too little of the request is left', async () => {
      const service = t.app.get(LinkImageCaptureService);
      const link = await create(a, { imageUrl: undefined, faviconUrl: undefined });
      fetchImage.mockClear();
      const stored = await service.capture(
        users.owner.userId,
        link.id,
        { faviconSourceUrl: FAVICON_URL, imageSourceUrl: IMAGE_URL },
        1_500,
      );
      expect(stored).toBe(false);
      expect(fetchImage).not.toHaveBeenCalled();
    });

    it('caps its time at 5 seconds (4 for the fetch) even when more is left', async () => {
      const service = t.app.get(LinkImageCaptureService);
      const link = await create(a, { imageUrl: undefined, faviconUrl: undefined });
      await service.capture(
        users.owner.userId,
        link.id,
        { faviconSourceUrl: null, imageSourceUrl: IMAGE_URL },
        60_000,
      );
      expect(fetchImage.mock.calls[0]?.[1]).toEqual({ totalTimeoutMs: 4_000 });
    });

    it('gives up at the deadline when a download hangs', async () => {
      const service = t.app.get(LinkImageCaptureService);
      const link = await create(a, { imageUrl: undefined, faviconUrl: undefined });
      fetchImage.mockImplementation(() => new Promise<SafeImageResult>(() => undefined));
      const started = Date.now();
      const stored = await service.capture(
        users.owner.userId,
        link.id,
        { faviconSourceUrl: null, imageSourceUrl: IMAGE_URL },
        2_000,
      );
      expect(stored).toBe(false);
      expect(Date.now() - started).toBeLessThan(3_500);
    });

    it('never stores images for a link of another user', async () => {
      const service = t.app.get(LinkImageCaptureService);
      const link = await create(a, { imageUrl: undefined, faviconUrl: undefined });
      fetchImage.mockClear();
      const stored = await service.capture(users.intruder.userId, link.id, {
        faviconSourceUrl: FAVICON_URL,
        imageSourceUrl: IMAGE_URL,
      });
      expect(stored).toBe(false);
      expect(fetchImage).not.toHaveBeenCalled();
      expect(await t.db.prisma.linkImage.count()).toBe(0);
    });

    it('replaces an earlier capture of the same kind', async () => {
      const service = t.app.get(LinkImageCaptureService);
      const link = await create(a);
      const before = await t.db.prisma.linkImage.findFirstOrThrow({
        where: { linkId: link.id, kind: LINK_IMAGE_KIND.Preview },
      });
      fetchImage.mockImplementation(async () => imageResult(await noisePng(30, 30)));
      await service.capture(users.owner.userId, link.id, {
        faviconSourceUrl: null,
        imageSourceUrl: IMAGE_URL,
      });
      const rows = await t.db.prisma.linkImage.findMany({
        where: { linkId: link.id, kind: LINK_IMAGE_KIND.Preview },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0]?.sha256).not.toBe(before.sha256);
    });
  });
});
