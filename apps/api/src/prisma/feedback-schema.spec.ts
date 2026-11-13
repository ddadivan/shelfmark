import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

describe('feedback table constraints (migrations applied to an in-memory PGlite)', () => {
  let database: TestDatabase;
  let userId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  beforeEach(async () => {
    userId = (await database.prisma.user.create({ data: { name: 'Ada', email: 'a@example.test' } }))
      .id;
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  const create = (data: { milestone: string; score?: number | null; comment?: string | null }) =>
    database.prisma.feedback.create({ data: { userId, ...data } });

  it('creates a row with a UUID v7 id and timestamps', async () => {
    const row = await create({ milestone: 'day3', score: 7, comment: 'ok' });
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it('allows one row per user and milestone', async () => {
    await create({ milestone: 'day3', score: 7 });
    await expect(create({ milestone: 'day3', score: 8 })).rejects.toMatchObject({ code: 'P2002' });
    await expect(create({ milestone: 'week1', score: 8 })).resolves.toBeDefined();
  });

  it.each([
    ['an unknown milestone', { milestone: 'day4', score: 5 }],
    ['score 0', { milestone: 'day3', score: 0 }],
    ['score 11', { milestone: 'day3', score: 11 }],
    ['a comment over 2000 characters', { milestone: 'day3', score: 5, comment: 'x'.repeat(2001) }],
    ['a comment without a score', { milestone: 'day3', score: null, comment: 'x' }],
  ])('rejects %s', async (_label, data) => {
    await expect(create(data)).rejects.toThrow();
  });

  it('accepts a null score and a comment of exactly 2000 characters', async () => {
    await expect(create({ milestone: 'day3', score: null })).resolves.toBeDefined();
    await expect(
      create({ milestone: 'week1', score: 1, comment: 'x'.repeat(2000) }),
    ).resolves.toBeDefined();
  });

  it('rejects a row for a missing user', async () => {
    await expect(
      database.prisma.feedback.create({
        data: { userId: '01990000-0000-7000-8000-000000000000', milestone: 'day3', score: 1 },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  describe('message rows (#272)', () => {
    const message = (data: Record<string, unknown> = {}) =>
      database.prisma.feedback.create({
        data: { userId, kind: 'idea', comment: 'hello', ...data },
      });

    it('defaults the status to received; NULL milestones never collide', async () => {
      const first = await message();
      await message();
      await message({ comment: 'again' });
      expect(first.status).toBe('received');
      expect(first.milestone).toBeNull();
      expect(await database.prisma.feedback.count({ where: { userId } })).toBe(3);
    });

    it('keeps the rating unique index working next to messages', async () => {
      await message();
      await create({ milestone: 'day3', score: 7 });
      await expect(create({ milestone: 'day3', score: 8 })).rejects.toMatchObject({
        code: 'P2002',
      });
    });

    it.each([
      ['an unknown kind', { kind: 'rant' }],
      ['an unknown status', { status: 'finished' }],
      ['a message with a milestone', { milestone: 'day3' }],
      ['a message with a score', { score: 5 }],
      ['a message without a comment', { comment: null }],
      ['a blank comment', { comment: '   ' }],
      ['a reply over 2000 characters', { reply: 'x'.repeat(2001) }],
      ['a client string over 300 characters', { clientUserAgent: 'x'.repeat(301) }],
    ])('rejects %s', async (_label, data) => {
      await expect(message(data)).rejects.toThrow();
    });

    it('accepts every status and a reply', async () => {
      for (const status of ['received', 'planned', 'in-progress', 'done', 'not-planned']) {
        await expect(message({ status })).resolves.toBeDefined();
      }
      await expect(message({ reply: 'ok' })).resolves.toBeDefined();
    });

    it('rejects a row that is neither rating nor message', async () => {
      await expect(
        database.prisma.feedback.create({ data: { userId, comment: 'neither' } }),
      ).rejects.toThrow();
    });
  });

  describe('screenshots (#352)', () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    let feedbackId: string;

    beforeEach(async () => {
      feedbackId = (
        await database.prisma.feedback.create({ data: { userId, kind: 'idea', comment: 'hi' } })
      ).id;
    });

    const shot = (data: { position?: number; bytes?: Buffer; type?: string } = {}) =>
      database.prisma.feedbackScreenshot.create({
        data: { feedbackId, position: 0, bytes: PNG, type: 'image/png', ...data },
      });

    it('takes positions 0 to 2, one row each, and 2 MB exactly', async () => {
      await shot({ position: 0 });
      await shot({ position: 1, type: 'image/jpeg' });
      await shot({ position: 2, bytes: Buffer.alloc(2 * 1024 * 1024), type: 'image/webp' });
      await expect(shot({ position: 1 })).rejects.toMatchObject({ code: 'P2002' });
      expect(await database.prisma.feedbackScreenshot.count({ where: { feedbackId } })).toBe(3);
    });

    it.each([
      ['position 3', { position: 3 }],
      ['position -1', { position: -1 }],
      ['an unknown type', { type: 'image/gif' }],
      ['an empty image', { bytes: Buffer.alloc(0) }],
      ['an image over 2 MB', { bytes: Buffer.alloc(2 * 1024 * 1024 + 1) }],
    ])('rejects %s', async (_label, data) => {
      await expect(shot(data)).rejects.toThrow();
    });

    it('rejects a missing message and goes with its message', async () => {
      await expect(
        database.prisma.feedbackScreenshot.create({
          data: {
            feedbackId: '01990000-0000-7000-8000-000000000000',
            position: 0,
            bytes: PNG,
            type: 'image/png',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
      await shot();
      await database.prisma.feedback.delete({ where: { id: feedbackId } });
      expect(await database.prisma.feedbackScreenshot.count()).toBe(0);
    });
  });
});
