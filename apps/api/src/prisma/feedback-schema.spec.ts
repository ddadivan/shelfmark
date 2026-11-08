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
});
