import { LINK_LIMIT, type LinkPreviewResponse } from '@shelfmark/contracts';
import { vi } from 'vitest';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';
import { seedLink } from '../../test-utils/seed-link';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { SafeFetchError } from '../fetcher/safe-fetch.error';
import { SAFE_FETCH_ERROR_CODE } from '../fetcher/models/safe-fetch-error-code.const';
import { PREVIEW_FETCH_LIMITS } from './models/preview-fetch-limits.const';

const PATH = '/api/links/preview';
const PAGE = `<html><head><title>Hello page</title>
<meta property="og:description" content="About hello">
<meta property="og:image" content="/cover.png">
<link rel="icon" href="/icon.png"></head><body></body></html>`;

describe('POST /api/links/preview', () => {
  const fetch = vi.fn<SafeFetcherService['fetch']>();
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp({
      overrides: [{ provide: SafeFetcherService, useValue: { fetch } }],
    });
  });

  beforeEach(async () => {
    fetch.mockReset();
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

  const preview = async (agent: TestAgent, url: string): Promise<LinkPreviewResponse> =>
    (await agent.post(PATH).send({ url }).expect(200)).body as LinkPreviewResponse;

  it('returns the extracted preview, fetched, with no duplicate', async () => {
    fetch.mockResolvedValue({
      finalUrl: 'https://hello.test/final',
      status: 200,
      contentType: 'text/html',
      body: PAGE,
    });
    const body = await preview(a, 'https://hello.test/start');
    expect(body).toEqual({
      preview: {
        kind: 'other',
        url: 'https://hello.test/final',
        title: 'Hello page',
        description: 'About hello',
        imageUrl: 'https://hello.test/cover.png',
        faviconUrl: 'https://hello.test/icon.png',
      },
      duplicate: null,
      fetched: true,
    });
    expect(fetch).toHaveBeenCalledWith('https://hello.test/start', PREVIEW_FETCH_LIMITS);
  });

  it('reports the own duplicate by normalized URL, with the folder name', async () => {
    fetch.mockResolvedValue({
      finalUrl: 'https://hello.test/page',
      status: 200,
      contentType: 'text/html',
      body: PAGE,
    });
    const folder = await t.db.prisma.folder.create({
      data: { userId: users.owner.userId, name: 'Reading' },
    });
    const id = await seedLink(t.db.prisma, users.owner.userId, {
      url: 'https://hello.test/page',
      title: 'Saved title',
      folderId: folder.id,
    });
    const unsorted = await seedLink(t.db.prisma, users.owner.userId, {
      url: 'https://other.test/x',
      title: 'Loose',
    });

    const body = await preview(a, 'https://HELLO.test/page/?utm_source=x#frag');
    expect(body.duplicate).toEqual({
      id,
      title: 'Saved title',
      folderId: folder.id,
      folderName: 'Reading',
    });

    fetch.mockResolvedValue({
      finalUrl: 'https://other.test/x',
      status: 200,
      contentType: 'text/html',
      body: PAGE,
    });
    expect((await preview(a, 'https://short.test/redirects')).duplicate).toMatchObject({
      id: unsorted,
      folderId: null,
      folderName: null,
    });
  });

  it('never reveals the link of another user as a duplicate', async () => {
    fetch.mockResolvedValue({
      finalUrl: 'https://hello.test/page',
      status: 200,
      contentType: 'text/html',
      body: PAGE,
    });
    await seedLink(t.db.prisma, users.intruder.userId, { url: 'https://hello.test/page' });
    expect((await preview(a, 'https://hello.test/page')).duplicate).toBeNull();
    expect((await preview(b, 'https://hello.test/page')).duplicate).not.toBeNull();
  });

  it('answers every fetch failure with the same fallback (no oracle)', async () => {
    const outcomes: unknown[] = [];
    for (const code of Object.values(SAFE_FETCH_ERROR_CODE)) {
      fetch.mockRejectedValueOnce(new SafeFetchError(code, 'x'));
      outcomes.push(await preview(a, 'https://down.test/page'));
    }
    fetch.mockRejectedValueOnce(new Error('boom'));
    outcomes.push(await preview(a, 'https://down.test/page'));
    for (const outcome of outcomes) expect(outcome).toEqual(outcomes[0]);
    expect(outcomes[0]).toMatchObject({
      preview: { url: 'https://down.test/page', title: 'https://down.test/page' },
      duplicate: null,
      fetched: false,
    });
  });

  it('still reports a duplicate when the page cannot be fetched', async () => {
    fetch.mockRejectedValue(new SafeFetchError(SAFE_FETCH_ERROR_CODE.Timeout, 'slow'));
    const id = await seedLink(t.db.prisma, users.owner.userId, { url: 'https://down.test/page' });
    const body = await preview(a, 'https://down.test/page');
    expect(body.fetched).toBe(false);
    expect(body.duplicate?.id).toBe(id);
  });

  it('rejects anything that is not a plain http(s) URL, before any fetch', async () => {
    const bad = [
      'javascript:alert(1)',
      'data:text/html,<script>1</script>',
      'vbscript:x',
      'ftp://files.test/a',
      'file:///etc/passwd',
      'example.com',
      '',
      'https://user:secret@hello.test/',
      `https://hello.test/${'a'.repeat(LINK_LIMIT.UrlMax)}`,
    ];
    for (const url of bad) await a.post(PATH).send({ url }).expect(400);
    await a.post(PATH).send({}).expect(400);
    await a.post(PATH).send({ url: 5 }).expect(400);
    await a.post(PATH).send({ url: 'https://hello.test/', extra: 1 }).expect(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires a session', async () => {
    await anonymous(t.app).post(PATH).send({ url: 'https://hello.test/' }).expect(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});
