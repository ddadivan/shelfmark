import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

describe('rule offer dismissals schema (AI-2, ADR 0049)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase();
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  const createUser = (email = 'ada@example.test') =>
    database.prisma.user.create({ data: { name: 'Ada', email } });

  it('keeps one row per user and domain', async () => {
    const ada = await createUser();
    const bob = await createUser('bob@example.test');
    const row = await database.prisma.ruleOfferDismissal.create({
      data: { userId: ada.id, domain: 'youtube.com' },
    });
    expect(row.createdAt).toBeInstanceOf(Date);
    await expect(
      database.prisma.ruleOfferDismissal.create({
        data: { userId: ada.id, domain: 'youtube.com' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await database.prisma.ruleOfferDismissal.create({
      data: { userId: bob.id, domain: 'youtube.com' },
    });
    expect(await database.prisma.ruleOfferDismissal.count()).toBe(2);
  });

  it('cascades with the user', async () => {
    const ada = await createUser();
    await database.prisma.ruleOfferDismissal.create({
      data: { userId: ada.id, domain: 'youtube.com' },
    });
    await database.prisma.user.delete({ where: { id: ada.id } });
    expect(await database.prisma.ruleOfferDismissal.count()).toBe(0);
  });

  it('indexes open suggestions by user and state', async () => {
    const rows = await database.prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'link_suggestions' AND indexname = 'link_suggestions_user_id_state_idx'`;
    expect(rows).toHaveLength(1);
  });
});
