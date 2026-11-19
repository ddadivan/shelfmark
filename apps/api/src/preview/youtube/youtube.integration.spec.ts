import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  AI_ENDPOINT,
  type AiJobResponse,
  type LinkPreviewResponse,
  type LinkResponse,
} from '@shelfmark/contracts';
import { AwaitableDeferrer } from '../../../test-utils/awaitable-deferrer';
import { createAuthTestApp } from '../../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../../test-utils/isolation/create-isolation-users';
import { asUser } from '../../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../../test-utils/models/auth-test-app.interface';
import type { TestAgent } from '../../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../../test-utils/reset-rate-limits';
import { AiBackgroundService } from '../../ai/background/ai-background.service';
import { AI_ENV } from '../../ai/models/ai-env.const';
import type { LinkJobInput } from '../../ai/models/link-job-input.interface';
import { MockAiProvider } from '../../ai/providers/mock-ai.provider';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { solidPng } from '../../links/images/test-images';
import { YOUTUBE_OEMBED_ENDPOINT } from './models/youtube-oembed-endpoint.token';

const LOOPBACK = '127.0.0.1';
const ID = 'dQw4w9WgXcQ';
const CANONICAL = `https://www.youtube.com/watch?v=${ID}`;
const CONSENT_PAGE =
  '<html><head><title>Before you continue to YouTube</title></head><body><p>Consent</p></body></html>';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * YouTube previews end to end against a local server (no real network): the app's real
 * SafeFetcherService, pinned to 127.0.0.1, asks the injected oEmbed endpoint of that server; the
 * "YouTube" page itself is served there too, on `www.youtube.com:<port>`, for the fallback.
 */
describe('YouTube previews through oEmbed', () => {
  let server: Server;
  let port: number;
  let oembed: Handler;
  let thumbnail: Buffer;
  const seen: string[] = [];
  let t: AuthTestApp;
  let a: TestAgent;
  const deferrer = new AwaitableDeferrer();

  const base = (): string => `http://${LOOPBACK}:${port}`;
  const video = (path = `/watch?v=${ID}`): string => `http://www.youtube.com:${port}${path}`;
  const json = (res: ServerResponse, status: number, body: unknown, type = 'application/json') => {
    res.writeHead(status, { 'Content-Type': type });
    res.end(typeof body === 'string' ? body : JSON.stringify(body));
  };
  const good = (res: ServerResponse) =>
    json(res, 200, {
      title: 'Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: `${base()}/vi/${ID}/hqdefault.jpg`,
      type: 'video',
    });

  beforeAll(async () => {
    thumbnail = await solidPng(480, 360);
    server = createServer((req, res) => {
      seen.push(req.url ?? '');
      const path = req.url ?? '';
      if (path.startsWith('/oembed')) {
        oembed(req, res);
      } else if (path.startsWith('/vi/')) {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(thumbnail);
      } else if (path.startsWith('/favicon')) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(CONSENT_PAGE);
      }
    });
    await new Promise<void>((resolve) => server.listen(0, LOOPBACK, resolve));
    port = (server.address() as AddressInfo).port;
    const fetcher = new SafeFetcherService({
      allowedPorts: [port],
      isAddressAllowed: (address) => address === LOOPBACK,
      resolve: async () => [LOOPBACK],
    });
    t = await createAuthTestApp({
      env: { [AI_ENV.FullAccessEmails]: undefined },
      overrides: [
        { provide: SafeFetcherService, useValue: fetcher },
        { provide: YOUTUBE_OEMBED_ENDPOINT, useValue: `${base()}/oembed` },
        { provide: AiBackgroundService, useValue: deferrer },
      ],
    });
  });

  beforeEach(async () => {
    seen.length = 0;
    oembed = (_req, res) => good(res);
    resetRateLimits(t.app);
    const users = await createIsolationUsers(t);
    a = asUser(t.app, users.owner);
  });

  afterEach(async () => {
    deferrer.clear();
    vi.restoreAllMocks();
    await t.db.truncateAll();
  });

  afterAll(async () => {
    await t.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const preview = async (url: string): Promise<LinkPreviewResponse> =>
    (await a.post('/api/links/preview').send({ url }).expect(200)).body as LinkPreviewResponse;

  it.each([`/watch?v=${ID}&t=42s`, `/shorts/${ID}`])(
    'previews %s from oEmbed with the canonical URL and never loads the page',
    async (path) => {
      const body = await preview(video(path));
      expect(body).toEqual({
        preview: {
          kind: 'video',
          url: CANONICAL,
          title: 'Never Gonna Give You Up',
          description: 'Rick Astley',
          imageUrl: `${base()}/vi/${ID}/hqdefault.jpg`,
          faviconUrl: 'https://www.youtube.com/favicon.ico',
        },
        duplicate: null,
        fetched: true,
      });
      expect(seen).toEqual([`/oembed?url=${encodeURIComponent(CANONICAL)}&format=json`]);
    },
  );

  it('saves a link without a title with the oEmbed title and captures the thumbnail like an og:image', async () => {
    const link = (await a.post('/api/links').send({ url: video() }).expect(201))
      .body as LinkResponse;
    expect(link).toMatchObject({ title: 'Never Gonna Give You Up', kind: 'video' });
    expect(link.imageUrl).toMatch(new RegExp(`^/api/links/${link.id}/image\\?v=`));
    expect(seen).toContain(`/vi/${ID}/hqdefault.jpg`);
    const image = await a.get(link.imageUrl ?? '').expect(200);
    expect(image.headers['content-type']).toBe('image/webp');
  });

  it.each<[string, Handler]>([
    ['a non-200 answer', (_req, res) => json(res, 404, { error: 'Not Found' })],
    ['an HTML answer', (_req, res) => json(res, 200, CONSENT_PAGE, 'text/html')],
    ['bad JSON', (_req, res) => json(res, 200, '{"title": ')],
    ['no title', (_req, res) => json(res, 200, { author_name: 'Someone' })],
    ['a dropped connection', (req) => req.socket.destroy()],
  ])('falls back to the normal page fetch after %s', async (_label, handler) => {
    oembed = handler;
    const body = await preview(video());
    expect(body.fetched).toBe(true);
    expect(body.preview).toMatchObject({
      url: video(),
      title: 'Before you continue to YouTube',
      imageUrl: null,
    });
    expect(seen).toEqual([
      `/oembed?url=${encodeURIComponent(CANONICAL)}&format=json`,
      `/watch?v=${ID}`,
    ]);
  });

  it('gives an AI draft (the extension and Add link path) the oEmbed title and channel as page context', async () => {
    const inputs: LinkJobInput[] = [];
    const original = MockAiProvider.prototype.runLinkJob;
    vi.spyOn(MockAiProvider.prototype, 'runLinkJob').mockImplementation(function (
      this: MockAiProvider,
      input,
    ) {
      inputs.push(input);
      return original.call(this, input);
    });
    await a.patch(AI_ENDPOINT.Settings).send({ enabled: true, meaningSearch: false }).expect(200);
    const started = (
      await a
        .post(AI_ENDPOINT.Drafts)
        .send({ draftId: randomUUID(), url: video(), title: 'YouTube' })
        .expect(202)
    ).body as AiJobResponse;
    await deferrer.flush();
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      excerpt: 'YouTube video: Never Gonna Give You Up by Rick Astley',
      description: 'Rick Astley',
    });
    expect(seen).not.toContain(`/watch?v=${ID}`);
    const ready = (await a.get(AI_ENDPOINT.Job.replace(':id', started.id)).expect(200))
      .body as AiJobResponse;
    expect(ready.status).toBe('done');
  });
});
