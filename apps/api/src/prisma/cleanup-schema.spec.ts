import { createTestDatabase } from '../../test-utils/test-database';
import type { TestDatabase } from '../../test-utils/models/test-database.interface';

describe('Clean-up schema (AI-5, ADR 0052)', () => {
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

  it('starts a report empty, with no run and an object of findings', async () => {
    const user = await createUser();
    const report = await database.prisma.cleanupReport.create({ data: { userId: user.id } });
    expect(report).toMatchObject({
      state: 'none',
      includeAi: false,
      checked: 0,
      total: 0,
      cursor: null,
      leaseUntil: null,
      findings: {},
      startedAt: null,
      cardDismissedAt: null,
    });
  });

  it('keeps one report per user', async () => {
    const user = await createUser();
    await database.prisma.cleanupReport.create({ data: { userId: user.id } });
    await expect(
      database.prisma.cleanupReport.create({ data: { userId: user.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('refuses an unknown state, negative counts and non-object findings', async () => {
    const user = await createUser();
    await database.prisma.cleanupReport.create({ data: { userId: user.id } });
    const where = { userId: user.id };
    await expect(
      database.prisma.cleanupReport.update({ where, data: { state: 'unknown' } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.cleanupReport.update({ where, data: { checked: -1 } }),
    ).rejects.toThrow();
    await expect(
      database.prisma.cleanupReport.update({ where, data: { findings: [1, 2] } }),
    ).rejects.toThrow();
  });

  it('counts AI clean-up runs per month, starting at zero', async () => {
    const user = await createUser();
    const usage = await database.prisma.aiUsage.create({
      data: { userId: user.id, month: new Date('2026-11-01T00:00:00.000Z') },
    });
    expect(usage.cleanupRuns).toBe(0);
  });

  it('cascades with the user', async () => {
    const user = await createUser();
    await database.prisma.cleanupReport.create({ data: { userId: user.id, state: 'ready' } });
    await database.prisma.user.delete({ where: { id: user.id } });
    expect(await database.prisma.cleanupReport.count()).toBe(0);
  });
});
