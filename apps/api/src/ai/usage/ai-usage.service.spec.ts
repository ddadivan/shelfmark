import { createTestDatabase } from '../../../test-utils/test-database';
import type { TestDatabase } from '../../../test-utils/models/test-database.interface';
import type { PrismaService } from '../../prisma/prisma.service';
import { AiUsageService } from './ai-usage.service';

const NOW = new Date('2026-11-17T12:00:00Z');
const NEXT_MONTH = new Date('2026-12-02T12:00:00Z');

describe('AiUsageService', () => {
  let database: TestDatabase;
  let usage: AiUsageService;
  let userId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    usage = new AiUsageService(database.prisma as unknown as PrismaService);
  });

  beforeEach(async () => {
    userId = (
      await database.prisma.user.create({ data: { name: 'Ada', email: 'ada@example.test' } })
    ).id;
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  const setLinks = (links: number, month = '2026-11-01') =>
    database.prisma.aiUsage.upsert({
      where: { userId_month: { userId, month: new Date(`${month}T00:00:00Z`) } },
      create: { userId, month: new Date(`${month}T00:00:00Z`), links },
      update: { links },
    });

  it('reads zero usage and the tier limits without a row', async () => {
    expect(await usage.read(userId, 'free', 0, NOW)).toEqual({
      linksUsed: 0,
      linksLimit: 50,
      resetsOn: '2026-12-01',
      backfillUsed: 0,
      backfillLimit: 0,
    });
    expect(await usage.read(userId, 'ai-pack', 12, NOW)).toMatchObject({
      linksLimit: 1000,
      backfillUsed: 12,
      backfillLimit: 5000,
    });
  });

  it('reserves up to the limit and then refuses', async () => {
    await setLinks(48);
    expect(await usage.reserve(userId, 'free', NOW)).toBe('2026-11-01');
    expect(await usage.hasRoom(userId, 'free', NOW)).toBe(true);
    expect(await usage.reserve(userId, 'free', NOW)).toBe('2026-11-01');
    expect(await usage.hasRoom(userId, 'free', NOW)).toBe(false);
    expect(await usage.reserve(userId, 'free', NOW)).toBeNull();
    expect((await usage.read(userId, 'free', 0, NOW)).linksUsed).toBe(50);
  });

  it('starts a new count each UTC month', async () => {
    await setLinks(50);
    expect(await usage.reserve(userId, 'free', NOW)).toBeNull();
    expect(await usage.reserve(userId, 'free', NEXT_MONTH)).toBe('2026-12-01');
    expect((await usage.read(userId, 'free', 0, NEXT_MONTH)).linksUsed).toBe(1);
  });

  it('lets only the limit win when reserves race', async () => {
    await setLinks(45);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => usage.reserve(userId, 'free', NOW)),
    );
    expect(results.filter((month) => month !== null)).toHaveLength(5);
    expect((await usage.read(userId, 'free', 0, NOW)).linksUsed).toBe(50);
  });

  it('refunds into the month of the reservation and never below zero', async () => {
    const month = await usage.reserve(userId, 'free', NOW);
    expect(month).not.toBeNull();
    await usage.refund(userId, month ?? '');
    await usage.refund(userId, month ?? '');
    expect((await usage.read(userId, 'free', 0, NOW)).linksUsed).toBe(0);
  });

  it('grants backfill links from the one-time allowance, partly at the end', async () => {
    await database.prisma.aiSettings.create({ data: { userId, backfillUsed: 4_980 } });
    expect(await usage.reserveBackfill(userId, 'free', 10)).toBe(0);
    expect(await usage.reserveBackfill(userId, 'ai-pack', 0)).toBe(0);
    expect(await usage.reserveBackfill(userId, 'ai-pack', 15)).toBe(15);
    expect(await usage.reserveBackfill(userId, 'ai-pack', 15)).toBe(5);
    expect(await usage.reserveBackfill(userId, 'ai-pack', 1)).toBe(0);
    await usage.refundBackfill(userId, 3);
    await usage.refundBackfill(userId, 0);
    const row = await database.prisma.aiSettings.findUniqueOrThrow({ where: { userId } });
    expect(row.backfillUsed).toBe(4_997);
  });

  it('grants nothing to a user without a settings row', async () => {
    expect(await usage.reserveBackfill(userId, 'ai-pack', 5)).toBe(0);
  });
});
