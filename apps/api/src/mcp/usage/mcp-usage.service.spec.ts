import { MCP_LIMIT } from '@shelfmark/contracts';
import { createTestDatabase } from '../../../test-utils/test-database';
import type { TestDatabase } from '../../../test-utils/models/test-database.interface';
import { McpUsageService } from './mcp-usage.service';

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
    expect(await usage.reserve(tokenId, now)).toBe(1);
    expect(await usage.reserve(tokenId, now)).toBe(2);
    expect(await usage.reserve(tokenId, new Date('2026-12-03T00:00:01Z'))).toBe(1);
    expect((await rows()).map((row) => row.calls)).toEqual([2, 1]);
  });

  it('refuses past the daily cap without counting', async () => {
    const now = new Date('2026-12-02T10:00:00Z');
    await database.prisma.mcpTokenUsage.create({
      data: { tokenId, day: new Date('2026-12-02'), calls: MCP_LIMIT.CallsPerTokenPerDay - 1 },
    });
    expect(await usage.reserve(tokenId, now)).toBe(MCP_LIMIT.CallsPerTokenPerDay);
    expect(await usage.reserve(tokenId, now)).toBeNull();
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
    expect(await usage.reserve(tokenId, new Date('2026-12-02T11:00:00Z'))).toBeNull();
    expect(await lastUsed()).toEqual(later);
  });
});
