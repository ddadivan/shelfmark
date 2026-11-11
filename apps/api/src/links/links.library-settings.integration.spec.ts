import {
  USER_SETTINGS_ENDPOINT,
  type LinkPreviewResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { solidPng } from './images/test-images';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

const BASE = '/api/links';
const PAGE = `<html><head><title>Fetched title</title>
<meta property="og:image" content="https://img.test/cover.png">
<link rel="icon" href="https://img.test/icon.png"></head><body></body></html>`;
const TRACKED = 'https://shop.test/coat?utm_source=news&id=7&fbclid=abc&gclid=1#size';
const CLEAN = 'https://shop.test/coat?id=7#size';

// Settings › Library › Saving (#284): "Fetch titles and previews" and "Keep the query part of links"
// change what the server does on create, update and preview, for the user who chose them only.
describe('links and the library save settings', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  const fetchImage = vi.fn<SafeFetcherService['fetchImage']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;
  let png: Buffer;

  beforeAll(async () => {
    png = await solidPng(800, 600);
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch, fetchImage } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockImplementation(async (url) => ({
      finalUrl: url,
      status: 200,
      contentType: 'text/html',
      body: PAGE,
    }));
    fetchImage.mockReset();
    fetchImage.mockImplementation(async (url) => ({
      finalUrl: url,
      status: 200,
      contentType: 'image/png',
      bytes: png,
    }));
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

  const create = async (agent: TestAgent, body: Record<string, unknown>): Promise<LinkResponse> =>
    (await agent.post(BASE).send(body).expect(201)).body as LinkResponse;

  describe('keep the query part (default off)', () => {
    it('removes tracking parameters on create and keeps the rest as written', async () => {
      const link = await create(a, { url: TRACKED, title: 'Coat' });
      expect(link.url).toBe(CLEAN);
      const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
      expect(row.url).toBe(CLEAN);
      expect(row.normalizedUrl).toBe('https://shop.test/coat?id=7');
    });

    it('never touches other parameters', async () => {
      const url = 'https://shop.test/coat?ref=feed&source=x&q=a+b&empty=';
      expect((await create(a, { url, title: 'Coat' })).url).toBe(url);
    });

    it('keeps every parameter for a user who keeps the query, and only for them', async () => {
      await a.patch(USER_SETTINGS_ENDPOINT).send({ keepQuery: true }).expect(200);
      expect((await create(a, { url: TRACKED, title: 'Coat' })).url).toBe(TRACKED);
      expect((await create(b, { url: TRACKED, title: 'Coat' })).url).toBe(CLEAN);
    });

    it('strips a new address on update too', async () => {
      const link = await create(a, { url: 'https://shop.test/a', title: 'A' });
      const res = await a.patch(`${BASE}/${link.id}`).send({ url: TRACKED }).expect(200);
      expect((res.body as LinkResponse).url).toBe(CLEAN);
      await a.patch(USER_SETTINGS_ENDPOINT).send({ keepQuery: true }).expect(200);
      const kept = await a.patch(`${BASE}/${link.id}`).send({ url: TRACKED }).expect(200);
      expect((kept.body as LinkResponse).url).toBe(TRACKED);
    });

    it('finds the duplicate of the stripped address and fetches that address', async () => {
      const saved = await create(a, { url: CLEAN, title: 'Coat' });
      const res = await a.post(`${BASE}/preview`).send({ url: TRACKED }).expect(200);
      const body = res.body as LinkPreviewResponse;
      expect(body.duplicate?.id).toBe(saved.id);
      expect(fetch).toHaveBeenCalledWith(CLEAN, expect.anything());
    });
  });

  describe('fetch titles and previews off', () => {
    beforeEach(async () => {
      await a.patch(USER_SETTINGS_ENDPOINT).send({ fetchPreviews: false }).expect(200);
    });

    it('saves only the address: no page, no images, the URL as title', async () => {
      const link = await create(a, { url: 'https://site.test/page' });
      expect(link.title).toBe('https://site.test/page');
      expect(link.imageUrl).toBeNull();
      expect(link.faviconUrl).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
      expect(fetchImage).not.toHaveBeenCalled();
    });

    it('ignores image hints sent by the client', async () => {
      const link = await create(a, {
        url: 'https://site.test/page',
        title: 'Page',
        imageUrl: 'https://img.test/cover.png',
        faviconUrl: 'https://img.test/icon.png',
      });
      expect(link.imageUrl).toBeNull();
      expect(fetchImage).not.toHaveBeenCalled();
      const row = await t.db.prisma.link.findUniqueOrThrow({ where: { id: link.id } });
      expect(row.imageSourceUrl).toBeNull();
      expect(row.faviconSourceUrl).toBeNull();
    });

    it('answers a preview without loading the page, and still finds the duplicate', async () => {
      const saved = await create(a, { url: 'https://site.test/page', title: 'Page' });
      const res = await a
        .post(`${BASE}/preview`)
        .send({ url: 'https://site.test/page/' })
        .expect(200);
      const body = res.body as LinkPreviewResponse;
      expect(body.fetched).toBe(false);
      expect(body.duplicate?.id).toBe(saved.id);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('keeps fetching for another user', async () => {
      const link = await create(b, { url: 'https://site.test/page' });
      expect(link.title).toBe('Fetched title');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetchImage).toHaveBeenCalled();
    });
  });
});
