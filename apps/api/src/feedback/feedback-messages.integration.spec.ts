import {
  FEEDBACK_ENDPOINT,
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_STATUS,
  type FeedbackMessage,
  type ListFeedbackMessagesResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

const MESSAGES = FEEDBACK_ENDPOINT.Messages;
const HOUR = 3_600_000;

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

function image(head: readonly number[], size = 64): Buffer {
  return Buffer.concat([Buffer.from(head), Buffer.alloc(Math.max(0, size - head.length), 7)]);
}

const upload = (type: string, bytes: Buffer) => ({ type, data: bytes.toString('base64') });

describe('feedback messages API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let a: TestAgent;
  let b: TestAgent;

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
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

  const send = (agent: TestAgent, body: unknown) => agent.post(MESSAGES).send(body as object);
  const valid = { kind: FEEDBACK_MESSAGE_KIND.Idea, text: 'Dark mode please' };

  async function seed(userId: string, count: number, createdAt: Date): Promise<void> {
    await t.db.prisma.feedback.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        userId,
        kind: FEEDBACK_MESSAGE_KIND.Other,
        comment: `seed ${i}`,
        createdAt,
      })),
    });
  }

  describe('POST', () => {
    it('stores a message as received and returns it', async () => {
      const res = await send(a, { ...valid, text: '  Dark mode please  ' }).expect(201);
      const message = res.body as FeedbackMessage;
      expect(message).toMatchObject({
        kind: 'idea',
        text: 'Dark mode please',
        status: FEEDBACK_STATUS.Received,
        reply: null,
        screenshotUrl: null,
      });
      expect(res.headers['cache-control']).toBe('no-store');
      const row = await t.db.prisma.feedback.findUniqueOrThrow({ where: { id: message.id } });
      expect(row).toMatchObject({
        userId: users.owner.userId,
        milestone: null,
        score: null,
        comment: 'Dark mode please',
      });
    });

    it('stores the screenshot bytes and client info', async () => {
      const png = image(PNG_HEAD, 300);
      const res = await send(a, {
        ...valid,
        screenshot: upload('image/png', png),
        client: { appVersion: '1.0', userAgent: 'Test/1' },
      }).expect(201);
      const message = res.body as FeedbackMessage;
      expect(message.screenshotUrl).toBe(`/api/feedback/messages/${message.id}/screenshot`);
      const row = await t.db.prisma.feedback.findUniqueOrThrow({ where: { id: message.id } });
      expect(Buffer.from(row.screenshot ?? []).equals(png)).toBe(true);
      expect(row).toMatchObject({
        screenshotType: 'image/png',
        clientAppVersion: '1.0',
        clientUserAgent: 'Test/1',
      });
    });

    it.each([
      ['png', 'image/png', PNG_HEAD],
      ['jpeg', 'image/jpeg', JPEG_HEAD],
      ['webp', 'image/webp', WEBP_HEAD],
    ])('accepts a %s screenshot', async (_name, type, head) => {
      await send(a, { ...valid, screenshot: upload(type, image(head)) }).expect(201);
    });

    it('accepts a screenshot of exactly the maximum size', async () => {
      const max = image(PNG_HEAD, FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes);
      await send(a, { ...valid, screenshot: upload('image/png', max) }).expect(201);
    });

    it('lets a demo user send too', async () => {
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { isDemo: true, demoExpiresAt: new Date(Date.now() + HOUR) },
      });
      await send(a, valid).expect(201);
    });

    it.each([
      ['a bad kind', { ...valid, kind: 'rant' }],
      ['a missing kind', { text: 'x' }],
      ['an empty text', { ...valid, text: '' }],
      ['a whitespace-only text', { ...valid, text: ' \n\t ' }],
      ['a text over the limit', { ...valid, text: 'x'.repeat(FEEDBACK_MESSAGE_LIMIT.TextMax + 1) }],
      ['a control character', { ...valid, text: 'a\u0000b' }],
      ['an extra field', { ...valid, extra: 1 }],
      [
        'an extra field in the screenshot',
        { ...valid, screenshot: { ...upload('image/png', image(PNG_HEAD)), x: 1 } },
      ],
      ['a wrong screenshot type', { ...valid, screenshot: upload('image/gif', image(PNG_HEAD)) }],
      ['bad base64', { ...valid, screenshot: { type: 'image/png', data: '!!!not base64!!!' } }],
      ['base64 without padding', { ...valid, screenshot: { type: 'image/png', data: 'iVBORw0' } }],
      ['an empty screenshot', { ...valid, screenshot: { type: 'image/png', data: '' } }],
      [
        'png bytes declared as jpeg',
        { ...valid, screenshot: upload('image/jpeg', image(PNG_HEAD)) },
      ],
      [
        'text declared as png',
        { ...valid, screenshot: upload('image/png', Buffer.from('hello world, not an image')) },
      ],
      [
        'a riff file that is not webp',
        {
          ...valid,
          screenshot: upload(
            'image/webp',
            image([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]),
          ),
        },
      ],
      [
        'an oversize screenshot',
        {
          ...valid,
          screenshot: upload(
            'image/png',
            image(PNG_HEAD, FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes + 1),
          ),
        },
      ],
      [
        'client info too long',
        { ...valid, client: { appVersion: 'x'.repeat(301), userAgent: 'ua' } },
      ],
      ['client info missing a key', { ...valid, client: { appVersion: '1.0' } }],
      [
        'client info with an extra key',
        { ...valid, client: { appVersion: '1', userAgent: 'u', x: 1 } },
      ],
    ])('rejects %s with 400', async (_label, body) => {
      const res = await send(a, body).expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
      expect(res.body).toHaveProperty('requestId');
      expect(await t.db.prisma.feedback.count()).toBe(0);
    });

    it('requires a session', async () => {
      await send(anonymous(t.app), valid).expect(401);
    });

    describe('body limit', () => {
      it('takes a body above 100kb on this route (up to 3mb)', async () => {
        const big = image(PNG_HEAD, 1_500_000);
        await send(a, { ...valid, screenshot: upload('image/png', big) }).expect(201);
      });

      it('answers 401 before parsing for a guest, even with a malformed or large body', async () => {
        const malformed = await anonymous(t.app)
          .post(MESSAGES)
          .set('Content-Type', 'application/json')
          .send('{"kind": ');
        expect(malformed.status).toBe(401);
        expect(malformed.body).toMatchObject({ statusCode: 401, error: 'Unauthorized' });
        expect(malformed.body).toHaveProperty('requestId');
        await send(anonymous(t.app), { ...valid, text: 'x'.repeat(2_000_000) }).expect(401);
        // A cookie of another name is no session cookie.
        await anonymous(t.app)
          .post(MESSAGES)
          .set('Cookie', 'other=1')
          .set('Content-Type', 'application/json')
          .send('{"kind": ')
          .expect(401);
      });

      it('answers 413 from Content-Length alone, without reading the body', async () => {
        const res = await anonymous(t.app)
          .post(MESSAGES)
          .set('Content-Type', 'application/json')
          .set('Content-Length', String(4 * 1024 * 1024))
          .send('{}');
        expect(res.status).toBe(413);
      });

      it('throttles per IP before parsing', async () => {
        for (let i = 0; i < 10; i++) await send(a, { kind: 'nope', text: 'x' }).expect(400);
        const res = await send(a, valid).expect(429);
        expect(res.headers['retry-after']).toBeDefined();
        expect(res.body).toMatchObject({ statusCode: 429 });
      });

      it('answers 413 above 3mb on this route', async () => {
        await send(a, { ...valid, text: 'x'.repeat(3 * 1024 * 1024 + 10) }).expect(413);
      });

      it('keeps 100kb on every other route', async () => {
        const res = await a
          .post(FEEDBACK_ENDPOINT.Record)
          .send({ milestone: 'day3', score: 5, comment: 'x'.repeat(200_000) })
          .expect(413);
        expect(res.body).toMatchObject({ statusCode: 413 });
        await a
          .post('/api/folders')
          .send({ name: 'x'.repeat(200_000) })
          .expect(413);
      });

      it('does not raise the limit for other methods on the same path', async () => {
        // GET has no body; a PATCH body above 100kb on this path is rejected before routing.
        await a
          .patch(MESSAGES)
          .send({ text: 'x'.repeat(200_000) })
          .expect(413);
      });
    });

    describe('hourly limit', () => {
      it('answers 429 with Retry-After and the error shape after PerHourMax messages', async () => {
        await seed(
          users.owner.userId,
          FEEDBACK_MESSAGE_LIMIT.PerHourMax,
          new Date(Date.now() - 1800_000),
        );
        const res = await send(a, valid).expect(429);
        expect(res.body).toMatchObject({ statusCode: 429, error: 'Too Many Requests' });
        expect(res.body).toHaveProperty('requestId');
        const retry = Number(res.headers['retry-after']);
        expect(retry).toBeGreaterThan(1700);
        expect(retry).toBeLessThanOrEqual(1800);
        expect(await t.db.prisma.feedback.count()).toBe(FEEDBACK_MESSAGE_LIMIT.PerHourMax);
      });

      it('counts only the last rolling hour', async () => {
        await seed(
          users.owner.userId,
          FEEDBACK_MESSAGE_LIMIT.PerHourMax,
          new Date(Date.now() - HOUR - 60_000),
        );
        await send(a, valid).expect(201);
      });

      it('lets the ninth message through and blocks the tenth after it', async () => {
        await seed(users.owner.userId, FEEDBACK_MESSAGE_LIMIT.PerHourMax - 1, new Date());
        await send(a, valid).expect(201);
        await send(a, valid).expect(429);
      });

      it('is per user', async () => {
        await seed(users.owner.userId, FEEDBACK_MESSAGE_LIMIT.PerHourMax, new Date());
        await send(b, valid).expect(201);
      });

      it('does not count ratings', async () => {
        await t.db.prisma.feedback.create({
          data: { userId: users.owner.userId, milestone: 'day3', score: 5 },
        });
        await seed(users.owner.userId, FEEDBACK_MESSAGE_LIMIT.PerHourMax - 1, new Date());
        await send(a, valid).expect(201);
      });

      it('holds under parallel requests', async () => {
        await seed(users.owner.userId, FEEDBACK_MESSAGE_LIMIT.PerHourMax - 2, new Date());
        const results = await Promise.all([send(a, valid), send(a, valid), send(a, valid)]);
        const statuses = results.map((r) => r.status).sort();
        expect(statuses).toEqual([201, 201, 429]);
      });
    });
  });

  describe('GET list', () => {
    it('lists only the own message rows, newest first', async () => {
      const first = (await send(a, { ...valid, text: 'first' }).expect(201))
        .body as FeedbackMessage;
      const second = (await send(a, { ...valid, text: 'second' }).expect(201))
        .body as FeedbackMessage;
      await send(b, { ...valid, text: 'foreign' }).expect(201);
      await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'day3', score: 8, comment: 'a rating' },
      });
      const res = await a.get(MESSAGES).expect(200);
      expect(res.headers['cache-control']).toBe('no-store');
      const items = (res.body as ListFeedbackMessagesResponse).items;
      expect(items.map((m) => m.id)).toEqual([second.id, first.id]);
      expect(JSON.stringify(res.body)).not.toContain('foreign');
      expect(JSON.stringify(res.body)).not.toContain('rating');
    });

    it('returns at most 100 items', async () => {
      await seed(users.owner.userId, 105, new Date());
      const res = await a.get(MESSAGES).expect(200);
      expect((res.body as ListFeedbackMessagesResponse).items).toHaveLength(100);
    });

    it('shows status and reply once the author set them', async () => {
      const message = (await send(a, valid).expect(201)).body as FeedbackMessage;
      await t.db.prisma.feedback.update({
        where: { id: message.id },
        data: { status: FEEDBACK_STATUS.Planned, reply: 'Thanks, soon' },
      });
      const item = ((await a.get(MESSAGES).expect(200)).body as ListFeedbackMessagesResponse)
        .items[0];
      expect(item).toMatchObject({ status: 'planned', reply: 'Thanks, soon' });
    });

    it('requires a session', async () => {
      await anonymous(t.app).get(MESSAGES).expect(401);
    });
  });

  describe('GET screenshot', () => {
    async function withScreenshot(agent: TestAgent, type: string, head: readonly number[]) {
      const bytes = image(head, 200);
      const message = (await send(agent, { ...valid, screenshot: upload(type, bytes) }).expect(201))
        .body as FeedbackMessage;
      return { message, bytes };
    }

    it('serves the stored bytes with the safe headers to the owner', async () => {
      const { message, bytes } = await withScreenshot(a, 'image/jpeg', JPEG_HEAD);
      const res = await a
        .get(message.screenshotUrl ?? '')
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toBe('image/jpeg');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-disposition']).toBe('inline');
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect(res.headers['cross-origin-resource-policy']).toBe('same-origin');
      expect(res.headers['content-security-policy']).toBe("sandbox; default-src 'none'");
      expect((res.body as Buffer).equals(bytes)).toBe(true);
    });

    it('is 404 for another user (data isolation)', async () => {
      const { message } = await withScreenshot(a, 'image/png', PNG_HEAD);
      const res = await b.get(message.screenshotUrl ?? '').expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('does not list the owner message for another user', async () => {
      await withScreenshot(a, 'image/png', PNG_HEAD);
      const items = ((await b.get(MESSAGES).expect(200)).body as ListFeedbackMessagesResponse)
        .items;
      expect(items).toEqual([]);
    });

    it('is 404 for a message without a screenshot, a missing id and a rating row', async () => {
      const plain = (await send(a, valid).expect(201)).body as FeedbackMessage;
      await a.get(`${MESSAGES}/${plain.id}/screenshot`).expect(404);
      await a.get(`${MESSAGES}/0198f6a0-0000-7000-8000-000000000000/screenshot`).expect(404);
      const rating = await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'day3', score: 3 },
      });
      await a.get(`${MESSAGES}/${rating.id}/screenshot`).expect(404);
    });

    it('is 400 for an id that is not a UUID and 401 without a session', async () => {
      await a.get(`${MESSAGES}/nope/screenshot`).expect(400);
      const { message } = await withScreenshot(a, 'image/png', PNG_HEAD);
      await anonymous(t.app)
        .get(message.screenshotUrl ?? '')
        .expect(401);
    });
  });

  describe('ratings are unaffected', () => {
    it('the rating prompt ignores message rows', async () => {
      const before = (await a.get(FEEDBACK_ENDPOINT.Prompt).expect(200)).body;
      await send(a, valid).expect(201);
      expect((await a.get(FEEDBACK_ENDPOINT.Prompt).expect(200)).body).toEqual(before);
    });

    it('a message row does not collide with ratings or with other messages', async () => {
      await send(a, valid).expect(201);
      await send(a, valid).expect(201);
      const rows = await t.db.prisma.feedback.findMany({ where: { userId: users.owner.userId } });
      expect(rows).toHaveLength(2);
    });
  });
});
