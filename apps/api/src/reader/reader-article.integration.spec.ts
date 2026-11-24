import { readFileSync } from 'node:fs';
import { LINK_KIND, READER_BLOCK_KIND, type ReaderArticleResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { expectIsolated } from '../../test-utils/isolation/expect-isolated';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import type { SafeFetchResult } from '../fetcher/models/safe-fetch-result.interface';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { READER_CACHE } from './models/reader-cache.const';
import { READER_FETCH_LIMITS } from './models/reader-fetch-limits.const';

const URL_A = 'https://bread.test/slow';
const ARTICLE_HTML = readFileSync(new URL('./fixtures/article.html', import.meta.url), 'utf8');
const SHOP_HTML = readFileSync(new URL('./fixtures/no-article.html', import.meta.url), 'utf8');

const page = (body = ARTICLE_HTML, status = 200, finalUrl = URL_A): SafeFetchResult => ({
  finalUrl,
  status,
  contentType: 'text/html',
  body,
});

describe('GET /api/links/:id/reader', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockResolvedValue(page());
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
  });

  const path = (id: string): string => `/api/links/${id}/reader`;
  const read = async (id: string): Promise<ReaderArticleResponse> =>
    (await a.get(path(id)).expect(200)).body as ReaderArticleResponse;
  const link = (options: Parameters<typeof seedLink>[2] = {}): Promise<string> =>
    seedLink(t.db.prisma, users.owner.userId, { url: URL_A, title: 'Bread', ...options });
  const storedRow = (linkId: string) =>
    t.db.prisma.linkReaderArticle.findUnique({ where: { linkId } });

  it('is isolated per user', async () => {
    await expectIsolated(t.app, users, {
      create: () => link(),
      read: (agent, id) => agent.get(path(id)),
      skip: {
        update: 'derived from the page: no write route',
        remove: 'deleted with the link or on a URL change',
        list: 'no list route',
        reference: 'nothing takes a link id from this resource',
      },
    });
  });

  it('extracts the article, stores it and answers the second open without a request', async () => {
    const id = await link();
    const first = await read(id);
    expect(fetch).toHaveBeenCalledWith(URL_A, READER_FETCH_LIMITS);
    expect(first.article?.title).toBe('Slow bread at home');
    expect(first.article?.blocks[0]?.kind).toBe(READER_BLOCK_KIND.Paragraph);
    const row = await storedRow(id);
    expect(row).toMatchObject({ userId: users.owner.userId, failed: false });
    expect(await read(id)).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stores a page without an article and answers null without asking again', async () => {
    fetch.mockResolvedValue(page(SHOP_HTML));
    const id = await link();
    expect(await read(id)).toEqual({ article: null });
    expect(await read(id)).toEqual({ article: null });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await storedRow(id)).toMatchObject({ article: null, failed: false });
  });

  it('answers null without any request while Fetch previews is off', async () => {
    await t.db.prisma.user.update({
      where: { id: users.owner.userId },
      data: { fetchPreviews: false },
    });
    const id = await link();
    expect(await read(id)).toEqual({ article: null });
    expect(fetch).not.toHaveBeenCalled();
    expect(await storedRow(id)).toBeNull();
  });

  it('answers null for a video without any request', async () => {
    const id = await link({ kind: LINK_KIND.Video });
    expect(await read(id)).toEqual({ article: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stores a failed fetch and asks again only after the retry time', async () => {
    fetch.mockRejectedValue(new SafeFetchError(SAFE_FETCH_ERROR_CODE.Timeout, 'Timed out'));
    const id = await link();
    expect(await read(id)).toEqual({ article: null });
    expect(await read(id)).toEqual({ article: null });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await storedRow(id)).toMatchObject({ failed: true });

    await t.db.prisma.linkReaderArticle.update({
      where: { linkId: id },
      data: { extractedAt: new Date(Date.now() - READER_CACHE.FailedRetryMs - 1_000) },
    });
    fetch.mockResolvedValue(page());
    expect((await read(id)).article?.title).toBe('Slow bread at home');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await storedRow(id)).toMatchObject({ failed: false });
  });

  it.each([404, 500])('treats the status %i as a failed fetch', async (status) => {
    fetch.mockResolvedValue(page(ARTICLE_HTML, status));
    const id = await link();
    expect(await read(id)).toEqual({ article: null });
    expect(await storedRow(id)).toMatchObject({ failed: true });
  });

  it('extracts again when the stored article does not match the contract', async () => {
    const id = await link();
    await t.db.prisma.linkReaderArticle.create({
      data: {
        linkId: id,
        userId: users.owner.userId,
        article: { title: 1 },
        extractedAt: new Date(),
      },
    });
    expect((await read(id)).article?.title).toBe('Slow bread at home');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('drops the stored article when PATCH gives the link a new page', async () => {
    const id = await link();
    await read(id);
    await a.patch(`/api/links/${id}`).send({ url: 'https://bread.test/other' }).expect(200);
    expect(await storedRow(id)).toBeNull();
    await read(id);
    expect(fetch).toHaveBeenLastCalledWith('https://bread.test/other', READER_FETCH_LIMITS);
  });

  it('keeps the stored article when PATCH changes only the title', async () => {
    const id = await link();
    await read(id);
    await a.patch(`/api/links/${id}`).send({ title: 'New title' }).expect(200);
    expect(await storedRow(id)).not.toBeNull();
  });

  it('does not store a result when the URL changed during the fetch', async () => {
    const id = await link();
    fetch.mockImplementation(async () => {
      await t.db.prisma.link.update({ where: { id }, data: { url: 'https://bread.test/moved' } });
      return page();
    });
    expect((await read(id)).article).not.toBeNull();
    expect(await storedRow(id)).toBeNull();
  });

  it('is a 404 for a trashed link and a 400 for a malformed id', async () => {
    const id = await link();
    await t.db.prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
    await a.get(path(id)).expect(404);
    await a.get(path('not-a-uuid')).expect(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('goes away with the link', async () => {
    const id = await link();
    await read(id);
    await t.db.prisma.link.delete({ where: { id } });
    expect(await storedRow(id)).toBeNull();
  });
});
