import { MCP_LIMIT } from '@shelfmark/contracts';
import { createTestDatabase } from '../../../test-utils/test-database';
import type { TestDatabase } from '../../../test-utils/models/test-database.interface';
import type { PrismaService } from '../../prisma/prisma.service';
import { MCP_USAGE_OUTCOME } from '../models/mcp-usage-outcome.const';
import { McpUsageService } from './mcp-usage.service';

const counted = (calls: number) => ({ kind: MCP_USAGE_OUTCOME.Counted, calls });
const CAPPED = { kind: MCP_USAGE_OUTCOME.Capped };
const REVOKED = { kind: MCP_USAGE_OUTCOME.Revoked };

describe('McpUsageService', () => {
  let database: TestDatabase;
  let usage: McpUsageService;
  let tokenId: string;

  beforeAll(async () => {
    database = await createTestDatabase();
    usage = new McpUsageService(database.prisma);
  });

  beforeEach(async () => {
    const user = await database.prisma.user.create({ data: { name: 'Ada', email: 'a@x.test' } });
    const token = await database.prisma.mcpToken.create({
      data: { userId: user.id, name: 'T', tokenHash: 'c'.repeat(64), last4: 'abcd' },
    });
    tokenId = token.id;
  });

  afterEach(async () => {
    await database.truncateAll();
  });

  afterAll(async () => {
    await database.close();
  });

  const rows = () =>
    database.prisma.mcpTokenUsage.findMany({ where: { tokenId }, orderBy: { day: 'asc' } });
  const lastUsed = async () =>
    (await database.prisma.mcpToken.findUniqueOrThrow({ where: { id: tokenId } })).lastUsedAt;

  it('counts calls per UTC day', async () => {
    const now = new Date('2026-12-02T10:00:00Z');
    expect(await usage.reserve(tokenId, now)).toEqual(counted(1));
    expect(await usage.reserve(tokenId, now)).toEqual(counted(2));
    expect(await usage.reserve(tokenId, new Date('2026-12-03T00:00:01Z'))).toEqual(counted(1));
    expect((await rows()).map((row) => row.calls)).toEqual([2, 1]);
  });

  it('refuses past the daily cap without counting', async () => {
    const now = new Date('2026-12-02T10:00:00Z');
    await database.prisma.mcpTokenUsage.create({
      data: { tokenId, day: new Date('2026-12-02'), calls: MCP_LIMIT.CallsPerTokenPerDay - 1 },
    });
    expect(await usage.reserve(tokenId, now)).toEqual(counted(MCP_LIMIT.CallsPerTokenPerDay));
    expect(await usage.reserve(tokenId, now)).toEqual(CAPPED);
    expect((await rows())[0].calls).toBe(MCP_LIMIT.CallsPerTokenPerDay);
  });

  it('deletes rows older than 35 days on the first call of a day only', async () => {
    await database.prisma.mcpTokenUsage.createMany({
      data: [
        { tokenId, day: new Date('2026-10-27'), calls: 5 },
        { tokenId, day: new Date('2026-10-28'), calls: 6 },
      ],
    });
    await database.prisma.mcpTokenUsage.create({
      data: { tokenId, day: new Date('2026-12-01'), calls: 1 },
    });
    // Not the first call of 2026-12-01: nothing is cleaned.
    await usage.reserve(tokenId, new Date('2026-12-01T12:00:00Z'));
    expect(await rows()).toHaveLength(3);
    // The first call of 2026-12-02: 2026-10-27 is older than 35 days, 2026-10-28 is not.
    await usage.reserve(tokenId, new Date('2026-12-02T12:00:00Z'));
    expect((await rows()).map((row) => row.day.toISOString().slice(0, 10))).toEqual([
      '2026-10-28',
      '2026-12-01',
      '2026-12-02',
    ]);
  });

  it('writes last_used_at at most once a minute and not past the cap', async () => {
    const first = new Date('2026-12-02T10:00:00Z');
    await usage.reserve(tokenId, first);
    expect(await lastUsed()).toEqual(first);
    await usage.reserve(tokenId, new Date('2026-12-02T10:00:59Z'));
    expect(await lastUsed()).toEqual(first);
    const later = new Date('2026-12-02T10:01:00Z');
    await usage.reserve(tokenId, later);
    expect(await lastUsed()).toEqual(later);

    await database.prisma.mcpTokenUsage.update({
      where: { tokenId_day: { tokenId, day: new Date('2026-12-02') } },
      data: { calls: MCP_LIMIT.CallsPerTokenPerDay },
    });
    expect(await usage.reserve(tokenId, new Date('2026-12-02T11:00:00Z'))).toEqual(CAPPED);
    expect(await lastUsed()).toEqual(later);
  });

  it('counts nothing for a token revoked after the guard resolved it', async () => {
    await database.prisma.mcpToken.delete({ where: { id: tokenId } });
    expect(await usage.reserve(tokenId, new Date('2026-12-02T10:00:00Z'))).toEqual(REVOKED);
    expect(await database.prisma.mcpTokenUsage.count()).toBe(0);
  });

  it('reads a foreign key error of a revoke racing the statement as revoked', async () => {
    const raceFk = Object.assign(new Error('fk'), {
      code: 'P2010',
      meta: { driverAdapterError: { cause: { originalCode: '23503' } } },
    });
    const racing = (error: unknown) =>
      new McpUsageService({
        $queryRaw: vi.fn().mockRejectedValue(error),
      } as unknown as PrismaService);
    expect(await racing(raceFk).reserve(tokenId)).toEqual(REVOKED);
    expect(
      await racing(Object.assign(new Error('fk'), { code: 'P2003' })).reserve(tokenId),
    ).toEqual(REVOKED);
    const other = Object.assign(new Error('down'), { code: 'P1001' });
    await expect(racing(other).reserve(tokenId)).rejects.toBe(other);
    await expect(racing('boom').reserve(tokenId)).rejects.toBe('boom');
  });
});
