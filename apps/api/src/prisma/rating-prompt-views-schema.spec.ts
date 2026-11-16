import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

describe('rating_prompt_views and admin_user_overview (migrations applied to an in-memory PGlite)', () => {
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

  const create = (data: { milestone: string; shownCount?: number }) =>
    database.prisma.ratingPromptView.create({ data: { userId, ...data } });

  it('defaults the count to 1 and allows one row per user and milestone', async () => {
    expect(await create({ milestone: 'day3' })).toMatchObject({ shownCount: 1 });
    await expect(create({ milestone: 'day3' })).rejects.toBeDefined();
    await expect(create({ milestone: 'week1' })).resolves.toBeDefined();
  });

  it('rejects an unknown milestone and a count below 1', async () => {
    await expect(create({ milestone: 'week2' })).rejects.toBeDefined();
    await expect(create({ milestone: 'day3', shownCount: 0 })).rejects.toBeDefined();
  });

  it('overview: counts live and trashed links and folders, ratings and views, without multiplying', async () => {
    const prisma = database.prisma;
    const folder = await prisma.folder.create({ data: { userId, name: 'F1' } });
    await prisma.folder.create({ data: { userId, name: 'F2', deletedAt: new Date() } });
    for (let i = 0; i < 3; i++) {
      await prisma.link.create({
        data: {
          userId,
          folderId: folder.id,
          url: `https://e.test/${i}`,
          normalizedUrl: `https://e.test/${i}`,
          title: 't',
          titleSortKey: 't',
        },
      });
    }
    await prisma.link.create({
      data: {
        userId,
        url: 'https://e.test/x',
        normalizedUrl: 'https://e.test/x',
        title: 't',
        titleSortKey: 't',
        deletedAt: new Date(),
      },
    });
    await prisma.feedback.create({ data: { userId, milestone: 'day3', score: 8 } });
    await prisma.feedback.create({ data: { userId, milestone: 'week1', score: null } });
    await prisma.feedback.create({ data: { userId, kind: 'idea', comment: 'hi' } });
    await create({ milestone: 'day3', shownCount: 2 });
    await create({ milestone: 'month1' });

    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM admin_user_overview WHERE id = ${userId}::uuid`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: 'a@example.test',
      is_demo: false,
      links: 3n,
      links_in_trash: 1n,
      folders: 1n,
      day3_score: '8',
      day3_shown: 2,
      week1_score: 'not now',
      week1_shown: 0,
      month1_score: null,
      month1_shown: 1,
      year1_score: null,
      year1_shown: 0,
    });
  });

  it('overview: a user without anything has zero counts and no content columns', async () => {
    const rows = await database.prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM admin_user_overview WHERE id = ${userId}::uuid`;
    expect(rows[0]).toMatchObject({ links: 0n, links_in_trash: 0n, folders: 0n });
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
      [
        'id',
        'email',
        'name',
        'is_demo',
        'signed_up',
        'last_active_on',
        'links',
        'links_in_trash',
        'folders',
        'day3_score',
        'day3_shown',
        'week1_score',
        'week1_shown',
        'month1_score',
        'month1_shown',
        'year1_score',
        'year1_shown',
      ].sort(),
    );
  });
});
