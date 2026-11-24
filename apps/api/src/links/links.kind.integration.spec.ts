import {
  LINK_KIND,
  deriveLinkKind,
  type ExportDocument,
  type LinkKind,
  type LinkPreviewResponse,
  type LinkResponse,
  type ListLinksResponse,
} from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';

const BASE = '/api/links';

function page(ogType: string): string {
  return `<html><head><title>Page</title><meta property="og:type" content="${ogType}"></head></html>`;
}

describe('links API: kind (ADR 0038)', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch, fetchImage: fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('offline'));
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

  const create = async (body: Record<string, unknown>): Promise<LinkResponse> =>
    (await a.post(BASE).send(body).expect(201)).body as LinkResponse;

  it('the preview carries the kind of og:type, and the host when the page says nothing', async () => {
    fetch.mockResolvedValueOnce({
      finalUrl: 'https://blog.test/post',
      status: 200,
      contentType: 'text/html',
      body: page('article'),
    });
    const article = (
      await a.post(`${BASE}/preview`).send({ url: 'https://blog.test/post' }).expect(200)
    ).body as LinkPreviewResponse;
    expect(article.preview.kind).toBe(LINK_KIND.Article);
    const offline = (
      await a.post(`${BASE}/preview`).send({ url: 'https://youtu.be/abc' }).expect(200)
    ).body as LinkPreviewResponse;
    expect(offline).toMatchObject({ fetched: false, preview: { kind: LINK_KIND.Video } });
  });

  it('create: the client kind wins, else the fetched page, else the host', async () => {
    expect(
      (await create({ url: 'https://example.test/a', title: 'A', kind: 'shopping' })).kind,
    ).toBe(LINK_KIND.Shopping);
    fetch.mockResolvedValueOnce({
      finalUrl: 'https://example.test/v',
      status: 200,
      contentType: 'text/html',
      body: page('video.movie'),
    });
    expect((await create({ url: 'https://example.test/v' })).kind).toBe(LINK_KIND.Video);
    expect((await create({ url: 'https://www.etsy.com/listing/1', title: 'Mug' })).kind).toBe(
      LINK_KIND.Shopping,
    );
    expect((await create({ url: 'https://example.test/b', title: 'B' })).kind).toBe(
      LINK_KIND.Other,
    );
  });

  it('rejects an unknown kind on create, update and list', async () => {
    await a
      .post(BASE)
      .send({ url: 'https://example.test/a', title: 'A', kind: 'sticker' })
      .expect(400);
    const link = await create({ url: 'https://example.test/a', title: 'A' });
    await a.patch(`${BASE}/${link.id}`).send({ kind: 'sticker' }).expect(400);
    await a.patch(`${BASE}/${link.id}`).send({ kind: null }).expect(400);
    await a.get(BASE).query({ kind: 'sticker' }).expect(400);
  });

  it('create detects the kinds of #537: URL rules, a PDF response and a JSON-LD recipe', async () => {
    expect((await create({ url: 'https://github.com/angular/angular' })).kind).toBe(LINK_KIND.Code);
    expect((await create({ url: 'https://open.spotify.com/episode/abc' })).kind).toBe(
      LINK_KIND.Podcast,
    );
    fetch.mockRejectedValueOnce(
      new SafeFetchError(
        SAFE_FETCH_ERROR_CODE.NotHtml,
        'Response is not HTML',
        undefined,
        'application/pdf',
      ),
    );
    expect((await create({ url: 'https://example.test/whitepaper' })).kind).toBe(
      LINK_KIND.Document,
    );
    fetch.mockResolvedValueOnce({
      finalUrl: 'https://food.test/ramen',
      status: 200,
      contentType: 'text/html',
      body: '<html><head><title>Ramen</title><meta property="og:type" content="article"><script type="application/ld+json">{"@type":"Recipe"}</script></head></html>',
    });
    expect((await create({ url: 'https://food.test/ramen' })).kind).toBe(LINK_KIND.Recipe);
  });

  it('accepts every new kind from the user and filters by it', async () => {
    const link = await create({ url: 'https://example.test/a', title: 'A' });
    for (const kind of Object.values(LINK_KIND)) {
      const body = (await a.patch(`${BASE}/${link.id}`).send({ kind }).expect(200))
        .body as LinkResponse;
      expect(body.kind).toBe(kind);
    }
    await a.patch(`${BASE}/${link.id}`).send({ kind: LINK_KIND.App }).expect(200);
    const apps = (await a.get(BASE).query({ kind: LINK_KIND.App }).expect(200))
      .body as ListLinksResponse;
    expect(apps.items.map((item) => item.id)).toEqual([link.id]);
    const moved = (
      await a
        .patch(`${BASE}/${link.id}`)
        .send({ url: 'https://x.com/someone/status/123' })
        .expect(200)
    ).body as LinkResponse;
    expect(moved.kind).toBe(LINK_KIND.Post);
  });

  it('update: a new URL recomputes the kind from the host unless the request sets one', async () => {
    const link = await create({ url: 'https://example.test/a', title: 'A', kind: 'article' });
    const moved = (
      await a.patch(`${BASE}/${link.id}`).send({ url: 'https://vimeo.com/1' }).expect(200)
    ).body as LinkResponse;
    expect(moved.kind).toBe(LINK_KIND.Video);
    const chosen = (
      await a
        .patch(`${BASE}/${link.id}`)
        .send({ url: 'https://example.test/b', kind: 'article' })
        .expect(200)
    ).body as LinkResponse;
    expect(chosen.kind).toBe(LINK_KIND.Article);
    // The same page written differently keeps the kind.
    const same = (
      await a.patch(`${BASE}/${link.id}`).send({ url: 'https://EXAMPLE.test/b' }).expect(200)
    ).body as LinkResponse;
    expect(same.kind).toBe(LINK_KIND.Article);
    const changed = (await a.patch(`${BASE}/${link.id}`).send({ kind: 'other' }).expect(200))
      .body as LinkResponse;
    expect(changed.kind).toBe(LINK_KIND.Other);
  });

  it('filters the list by kind, combined with the other filters, never with Trash', async () => {
    const userId = users.owner.userId;
    const video = await seedLink(t.db.prisma, userId, {
      kind: 'video',
      title: 'Talk',
      isFavorite: true,
    });
    await seedLink(t.db.prisma, userId, { kind: 'video', title: 'Other talk' });
    await seedLink(t.db.prisma, userId, { kind: 'article', title: 'Talk notes', isFavorite: true });
    const trashed = await seedLink(t.db.prisma, userId, { kind: 'video', title: 'Gone' });
    await a.delete(`${BASE}/${trashed}`).expect(204);
    const ids = async (query: Record<string, unknown>): Promise<string[]> =>
      ((await a.get(BASE).query(query).expect(200)).body as ListLinksResponse).items.map(
        (item) => item.id,
      );
    expect(await ids({ kind: 'video' })).toHaveLength(2);
    expect(await ids({ kind: 'video', favorite: true })).toEqual([video]);
    expect(await ids({ kind: 'shopping' })).toEqual([]);
  });

  it('filters the list by when the link was saved: the last week or month (Filter › Saved)', async () => {
    const userId = users.owner.userId;
    const day = 24 * 60 * 60 * 1000;
    const recent = await seedLink(t.db.prisma, userId, {
      kind: 'recipe',
      createdAt: new Date(Date.now() - 2 * day),
    });
    const lastMonth = await seedLink(t.db.prisma, userId, {
      kind: 'recipe',
      createdAt: new Date(Date.now() - 20 * day),
    });
    await seedLink(t.db.prisma, userId, {
      kind: 'recipe',
      createdAt: new Date(Date.now() - 90 * day),
    });
    const ids = async (query: Record<string, unknown>): Promise<string[]> =>
      ((await a.get(BASE).query(query).expect(200)).body as ListLinksResponse).items.map(
        (item) => item.id,
      );
    expect(await ids({ kind: 'recipe', saved: 'week' })).toEqual([recent]);
    expect(await ids({ kind: 'recipe', saved: 'month' })).toEqual([recent, lastMonth]);
    expect(await ids({ kind: 'recipe' })).toHaveLength(3);
    await a.get(BASE).query({ saved: 'year' }).expect(400);
  });

  it('the export carries the kind and filters by it', async () => {
    const userId = users.owner.userId;
    await seedLink(t.db.prisma, userId, {
      kind: 'video',
      url: 'https://example.test/v',
      title: 'V',
    });
    await seedLink(t.db.prisma, userId, { url: 'https://example.test/o', title: 'O' });
    const all = (await a.get('/api/export').query({ format: 'json' }).expect(200))
      .body as ExportDocument;
    expect(all.links.map((link) => link.kind).sort()).toEqual(['other', 'video']);
    const videos = (await a.get('/api/export').query({ format: 'json', kind: 'video' }).expect(200))
      .body as ExportDocument;
    expect(videos.links.map((link) => link.title)).toEqual(['V']);
    await a.get('/api/export').query({ format: 'json', kind: 'nope' }).expect(400);
  });

  it('the export round-trips all ten kinds in JSON, CSV and, by URL, in HTML (#537)', async () => {
    const userId = users.owner.userId;
    const urls: Record<LinkKind, string> = {
      video: 'https://youtu.be/abc',
      article: 'https://blog.test/post',
      shopping: 'https://www.etsy.com/listing/1',
      podcast: 'https://open.spotify.com/episode/abc',
      document: 'https://docs.google.com/document/d/1/edit',
      code: 'https://github.com/angular/angular',
      app: 'https://apps.apple.com/app/id1',
      post: 'https://x.com/someone/status/1',
      recipe: 'https://food.test/ramen',
      other: 'https://example.test/o',
    };
    for (const kind of Object.values(LINK_KIND)) {
      await seedLink(t.db.prisma, userId, { kind, url: urls[kind], title: kind });
    }
    const json = (await a.get('/api/export').query({ format: 'json' }).expect(200))
      .body as ExportDocument;
    expect(Object.fromEntries(json.links.map((link) => [link.title, link.kind]))).toEqual(
      Object.fromEntries(Object.values(LINK_KIND).map((kind) => [kind, kind])),
    );
    // The export has a tight rate limit: one filtered call is enough next to the list filter specs.
    for (const kind of [LINK_KIND.Recipe]) {
      const only = (await a.get('/api/export').query({ format: 'json', kind }).expect(200))
        .body as ExportDocument;
      expect(only.links.map((link) => link.title)).toEqual([kind]);
    }
    const csv = (await a.get('/api/export').query({ format: 'csv' }).expect(200)).text;
    const [header, ...rows] = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    const columns = (header ?? '').split(',');
    const at = (name: string) => columns.indexOf(name);
    const fromCsv = Object.fromEntries(
      rows.map((row) => row.split(',')).map((cells) => [cells[at('title')], cells[at('kind')]]),
    );
    expect(fromCsv).toEqual(
      Object.fromEntries(Object.values(LINK_KIND).map((kind) => [kind, kind])),
    );
    // HTML carries no kind; an import derives it again from the URL, which holds for URL-ruled kinds.
    const html = (await a.get('/api/export').query({ format: 'html' }).expect(200)).text;
    const byUrl: LinkKind[] = [
      LINK_KIND.Video,
      LINK_KIND.Shopping,
      LINK_KIND.Podcast,
      LINK_KIND.Document,
      LINK_KIND.Code,
      LINK_KIND.App,
      LINK_KIND.Post,
    ];
    for (const kind of byUrl) {
      expect(html).toContain(`HREF="${urls[kind]}"`);
      expect(deriveLinkKind(urls[kind])).toBe(kind);
    }
  });
});
