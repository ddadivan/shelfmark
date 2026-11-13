import {
  ADMIN_ENDPOINT,
  ADMIN_FEEDBACK_LIMIT,
  FEEDBACK_ENDPOINT,
  FEEDBACK_STATUS,
  type AdminFeedbackItem,
  type ListAdminFeedbackResponse,
  type ListFeedbackMessagesResponse,
} from '@shelfmark/contracts';
import { createAuthTestApp } from '../../test-utils/auth-test-app';
import { createIsolationUsers } from '../../test-utils/isolation/create-isolation-users';
import { anonymous, asUser } from '../../test-utils/isolation/test-agent';
import type { AuthTestApp } from '../../test-utils/models/auth-test-app.interface';
import type { IsolationUsers } from '../../test-utils/models/isolation-users.interface';
import type { TestAgent } from '../../test-utils/models/test-agent.interface';
import { resetRateLimits } from '../../test-utils/reset-rate-limits';

const FEEDBACK = ADMIN_ENDPOINT.Feedback;
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(40, 3),
]);

describe('admin API', () => {
  let t: AuthTestApp;
  let users: IsolationUsers;
  let admin: TestAgent;
  let other: TestAgent;
  const savedEnv = process.env['ADMIN_EMAILS'];

  beforeAll(async () => {
    t = await createAuthTestApp();
  });

  beforeEach(async () => {
    process.env['ADMIN_EMAILS'] = ' Other@Example.com , owner@example.com ';
    resetRateLimits(t.app);
    users = await createIsolationUsers(t);
    // owner is the admin, intruder is a regular user.
    admin = asUser(t.app, users.owner);
    other = asUser(t.app, users.intruder);
  });

  afterEach(async () => {
    await t.db.truncateAll();
  });

  afterAll(async () => {
    if (savedEnv === undefined) delete process.env['ADMIN_EMAILS'];
    else process.env['ADMIN_EMAILS'] = savedEnv;
    await t.close();
  });

  async function message(
    userId: string,
    data: { comment?: string; createdAt?: Date; screenshots?: number; status?: string } = {},
  ) {
    return t.db.prisma.feedback.create({
      data: {
        userId,
        kind: 'idea',
        comment: data.comment ?? 'hello',
        createdAt: data.createdAt,
        status: data.status,
        screenshots: {
          create: Array.from({ length: data.screenshots ?? 0 }, (_, position) => ({
            position,
            bytes: PNG,
            type: 'image/png',
          })),
        },
      },
    });
  }

  const routes: [
    string,
    string,
    (agent: TestAgent, path: string) => ReturnType<TestAgent['get']>,
  ][] = [
    ['GET', ADMIN_ENDPOINT.Status, (agent, path) => agent.get(path)],
    ['GET', FEEDBACK, (agent, path) => agent.get(path)],
    [
      'PATCH',
      `${FEEDBACK}/0198f6a0-0000-7000-8000-000000000000`,
      (agent, path) => agent.patch(path).send({ status: 'done' }),
    ],
    [
      'GET',
      `${FEEDBACK}/0198f6a0-0000-7000-8000-000000000000/screenshots/0`,
      (agent, path) => agent.get(path),
    ],
  ];

  describe('who may use it', () => {
    it.each(routes)('%s %s is 404 for a guest', async (_m, path, call) => {
      const res = await call(anonymous(t.app), path).expect(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it.each(routes)(
      '%s %s is 404 for a signed-in user who is not an admin',
      async (_m, path, call) => {
        await call(other, path).expect(404);
      },
    );

    it.each(routes)(
      '%s %s is 404 for everyone while ADMIN_EMAILS is unset',
      async (_m, path, call) => {
        delete process.env['ADMIN_EMAILS'];
        await call(admin, path).expect(404);
      },
    );

    it.each(routes)('%s %s is 404 while ADMIN_EMAILS is empty or blank', async (_m, path, call) => {
      process.env['ADMIN_EMAILS'] = ' , ,';
      await call(admin, path).expect(404);
    });

    it('is 404 for a demo user even with a listed email', async () => {
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { isDemo: true, demoExpiresAt: new Date(Date.now() + 3_600_000) },
      });
      await admin.get(ADMIN_ENDPOINT.Status).expect(404);
    });

    it('matches the email case-insensitively and answers { admin: true }', async () => {
      const res = await admin.get(ADMIN_ENDPOINT.Status).expect(200);
      expect(res.body).toEqual({ admin: true });
      process.env['ADMIN_EMAILS'] = 'OWNER@EXAMPLE.COM';
      await admin.get(ADMIN_ENDPOINT.Status).expect(200);
    });

    it('does not take a partial email match', async () => {
      process.env['ADMIN_EMAILS'] = 'wner@example.com,owner@example.co';
      await admin.get(ADMIN_ENDPOINT.Status).expect(404);
    });

    it('is 404 when the listed email is not verified', async () => {
      await t.db.prisma.user.update({
        where: { id: users.owner.userId },
        data: { emailVerified: false },
      });
      await admin.get(ADMIN_ENDPOINT.Status).expect(404);
      await admin.get(FEEDBACK).expect(404);
    });

    it('is 404 for a look-alike non-ASCII address and ignores non-ASCII list entries', async () => {
      process.env['ADMIN_EMAILS'] = '\uff4fwner@example.com,owner@example.com\u212a';
      await admin.get(ADMIN_ENDPOINT.Status).expect(404);
      process.env['ADMIN_EMAILS'] = '\uff4fwner@example.com, owner@example.com';
      await admin.get(ADMIN_ENDPOINT.Status).expect(200);
    });

    it('is 404 for a guest on a differently cased path', async () => {
      await anonymous(t.app).get('/api/Admin/status').expect(404);
      await anonymous(t.app).get('/api/ADMIN/feedback').expect(404);
    });

    it('is not listed in Swagger', async () => {
      const res = await anonymous(t.app).get('/api/docs-json').expect(200);
      expect(JSON.stringify(res.body)).not.toContain('/api/admin');
    });

    it('keeps 401 outside /api/admin for guests', async () => {
      await anonymous(t.app).get(FEEDBACK_ENDPOINT.Messages).expect(401);
    });
  });

  describe('GET feedback', () => {
    it('lists the messages of all users newest first with the sender, and no ratings', async () => {
      const old = await message(users.intruder.userId, {
        comment: 'from intruder',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const recent = await message(users.owner.userId, {
        comment: 'from owner',
        createdAt: new Date('2026-02-01T00:00:00Z'),
        screenshots: 2,
      });
      await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'day3', score: 5, comment: 'rating' },
      });
      const res = await admin.get(FEEDBACK).expect(200);
      const body = res.body as ListAdminFeedbackResponse;
      expect(res.headers['cache-control']).toBe('no-store');
      expect(body.items.map((i) => i.id)).toEqual([recent.id, old.id]);
      expect(body.nextCursor).toBeNull();
      expect(body.items[0]).toMatchObject({
        text: 'from owner',
        user: { name: 'Owner', email: 'owner@example.com' },
        screenshotUrls: [0, 1].map(
          (position) => `/api/admin/feedback/${recent.id}/screenshots/${position}`,
        ),
      });
      expect(body.items[1].user).toEqual({ name: 'Intruder', email: 'intruder@example.com' });
      expect(body.items[1].screenshotUrls).toEqual([]);
      expect(JSON.stringify(body)).not.toContain('rating');
    });

    it('filters by status', async () => {
      await message(users.owner.userId, { status: 'done' });
      const planned = await message(users.owner.userId, { status: 'planned' });
      const body = (await admin.get(`${FEEDBACK}?status=planned`).expect(200))
        .body as ListAdminFeedbackResponse;
      expect(body.items.map((i) => i.id)).toEqual([planned.id]);
    });

    it('pages with a keyset cursor, ties on createdAt included', async () => {
      const same = new Date('2026-03-01T00:00:00Z');
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(
          (
            await message(users.owner.userId, {
              createdAt: i < 3 ? same : new Date(same.getTime() + i * 1000),
            })
          ).id,
        );
      }
      const seen: string[] = [];
      let cursor: string | null = null;
      let pages = 0;
      do {
        const query: string = cursor ? `limit=2&cursor=${cursor}` : 'limit=2';
        const body = (await admin.get(`${FEEDBACK}?${query}`).expect(200))
          .body as ListAdminFeedbackResponse;
        seen.push(...body.items.map((i) => i.id));
        cursor = body.nextCursor;
        pages += 1;
      } while (cursor);
      expect(pages).toBe(3);
      expect([...seen].sort()).toEqual([...ids].sort());
      expect(new Set(seen).size).toBe(5);
    });

    it.each([
      ['a bad status', 'status=nope'],
      ['limit 0', 'limit=0'],
      ['limit 101', 'limit=101'],
      ['a text limit', 'limit=abc'],
      ['a malformed cursor', 'cursor=@@@'],
      ['a cursor with another shape', `cursor=${Buffer.from('{"v":2}').toString('base64url')}`],
      ['an unknown query key', 'x=1'],
    ])('rejects %s with 400', async (_label, query) => {
      await admin.get(`${FEEDBACK}?${query}`).expect(400);
    });
  });

  describe('PATCH feedback/:id', () => {
    it('sets status and reply, and the owner then sees them', async () => {
      const row = await message(users.intruder.userId, { comment: 'please add X' });
      const res = await admin
        .patch(`${FEEDBACK}/${row.id}`)
        .send({ status: FEEDBACK_STATUS.InProgress, reply: '  Working on it  ' })
        .expect(200);
      const item = res.body as AdminFeedbackItem;
      expect(item).toMatchObject({
        id: row.id,
        status: 'in-progress',
        reply: 'Working on it',
        text: 'please add X',
        user: { email: 'intruder@example.com' },
      });
      const own = (await other.get(FEEDBACK_ENDPOINT.Messages).expect(200))
        .body as ListFeedbackMessagesResponse;
      expect(own.items[0]).toMatchObject({ status: 'in-progress', reply: 'Working on it' });
      expect(new Date(own.items[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
        row.updatedAt.getTime(),
      );
    });

    it('updates only what is sent and clears the reply with null or blank', async () => {
      const row = await message(users.owner.userId);
      await admin.patch(`${FEEDBACK}/${row.id}`).send({ reply: 'hi' }).expect(200);
      const statusOnly = await admin
        .patch(`${FEEDBACK}/${row.id}`)
        .send({ status: 'done' })
        .expect(200);
      expect(statusOnly.body).toMatchObject({ status: 'done', reply: 'hi' });
      const cleared = await admin.patch(`${FEEDBACK}/${row.id}`).send({ reply: null }).expect(200);
      expect(cleared.body).toMatchObject({ status: 'done', reply: null });
      await admin.patch(`${FEEDBACK}/${row.id}`).send({ reply: 'again' }).expect(200);
      const blank = await admin.patch(`${FEEDBACK}/${row.id}`).send({ reply: '   ' }).expect(200);
      expect(blank.body).toMatchObject({ reply: null });
    });

    it.each([
      ['a bad status', { status: 'finished' }],
      ['a null status', { status: null }],
      ['a reply over the limit', { reply: 'x'.repeat(ADMIN_FEEDBACK_LIMIT.ReplyMax + 1) }],
      ['a non-string reply', { reply: 5 }],
      ['a control character', { reply: 'a\u0000b' }],
      ['an extra field', { status: 'done', kind: 'other' }],
      ['an empty body', {}],
    ])('rejects %s with 400', async (_label, body) => {
      const row = await message(users.owner.userId);
      await admin.patch(`${FEEDBACK}/${row.id}`).send(body).expect(400);
      expect((await t.db.prisma.feedback.findUniqueOrThrow({ where: { id: row.id } })).status).toBe(
        'received',
      );
    });

    it('accepts a reply of exactly the limit', async () => {
      const row = await message(users.owner.userId);
      await admin
        .patch(`${FEEDBACK}/${row.id}`)
        .send({ reply: 'x'.repeat(ADMIN_FEEDBACK_LIMIT.ReplyMax) })
        .expect(200);
    });

    it('is 404 for a missing id and for a rating row, 400 for a non-UUID', async () => {
      await admin
        .patch(`${FEEDBACK}/0198f6a0-0000-7000-8000-000000000000`)
        .send({ status: 'done' })
        .expect(404);
      const rating = await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'day3', score: 4 },
      });
      await admin.patch(`${FEEDBACK}/${rating.id}`).send({ status: 'done' }).expect(404);
      await admin.patch(`${FEEDBACK}/nope`).send({ status: 'done' }).expect(400);
    });

    it('a non-admin cannot change a message', async () => {
      const row = await message(users.intruder.userId);
      await other.patch(`${FEEDBACK}/${row.id}`).send({ status: 'done' }).expect(404);
      expect((await t.db.prisma.feedback.findUniqueOrThrow({ where: { id: row.id } })).status).toBe(
        'received',
      );
    });

    it('is rate limited', async () => {
      const row = await message(users.owner.userId);
      for (let i = 0; i < 60; i++) {
        await admin.patch(`${FEEDBACK}/${row.id}`).send({ status: 'planned' }).expect(200);
      }
      await admin.patch(`${FEEDBACK}/${row.id}`).send({ status: 'planned' }).expect(429);
    });

    it('rejects a foreign Origin (CSRF guard)', async () => {
      const row = await message(users.owner.userId);
      await admin
        .patch(`${FEEDBACK}/${row.id}`)
        .set('Origin', 'https://evil.example')
        .send({ status: 'done' })
        .expect(403);
    });
  });

  describe('GET feedback/:id/screenshots/:position', () => {
    it('serves every screenshot of any user with the safe headers', async () => {
      const row = await message(users.intruder.userId, { screenshots: 3 });
      for (const position of [0, 1, 2]) {
        const res = await admin.get(`${FEEDBACK}/${row.id}/screenshots/${position}`).expect(200);
        expect(res.headers['content-type']).toBe('image/png');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['content-disposition']).toBe('inline');
        expect(res.headers['cache-control']).toBe('private, no-store');
        expect(res.headers['content-security-policy']).toBe("sandbox; default-src 'none'");
      }
    });

    it('is 404 without a screenshot there, for a rating row and for a non-admin', async () => {
      const plain = await message(users.intruder.userId);
      await admin.get(`${FEEDBACK}/${plain.id}/screenshots/0`).expect(404);
      const withShot = await message(users.intruder.userId, { screenshots: 1 });
      await admin.get(`${FEEDBACK}/${withShot.id}/screenshots/1`).expect(404);
      await admin.get(`${FEEDBACK}/${withShot.id}/screenshots/7`).expect(404);
      const rating = await t.db.prisma.feedback.create({
        data: { userId: users.owner.userId, milestone: 'day3', score: 5 },
      });
      await admin.get(`${FEEDBACK}/${rating.id}/screenshots/0`).expect(404);
      await other.get(`${FEEDBACK}/${withShot.id}/screenshots/0`).expect(404);
      await anonymous(t.app).get(`${FEEDBACK}/${withShot.id}/screenshots/0`).expect(404);
    });
  });
});
