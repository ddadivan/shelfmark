import type { PrismaService } from '../../prisma/prisma.service';
import type { McpLinkRow } from '../models/mcp-link-row.type';
import type { McpMeaningSearch } from '../models/mcp-meaning-search.interface';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import { SearchLinksTool } from './search-links.tool';

const PRINCIPAL = { userId: 'u1', tokenId: 't1', includeNotes: false };

function row(id: string): McpLinkRow {
  return {
    id,
    url: `https://example.test/${id}`,
    title: id,
    folderId: null,
    note: null,
    summary: null,
    summarySource: null,
    kind: 'other',
    isFavorite: false,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    lastOpenedAt: null,
    tags: [],
  };
}

/** The AI-3 seam: meaning matches fill the slots the word matches left, filtered like them. */
describe('SearchLinksTool meaning seam', () => {
  it('appends meaning matches after word matches, deduplicated, in ranked order', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([row('w1')])
      .mockResolvedValueOnce([row('m2'), row('m1')]);
    const prisma = {
      link: { findMany },
      folder: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const meaning: McpMeaningSearch = {
      find: vi.fn().mockResolvedValue(['w1', 'm1', 'm2', 'gone']),
    };
    const tool = new SearchLinksTool(prisma, meaning);

    const outcome = await tool.run(PRINCIPAL, { query: 'q', limit: 3, tag: 'x' });
    expect(outcome).toMatchObject({ kind: MCP_TOOL_CALL_KIND.Ok, count: 3 });
    const items =
      outcome.kind === MCP_TOOL_CALL_KIND.Ok
        ? (outcome.structured['items'] as { id: string; match: string }[])
        : [];
    expect(items.map((item) => [item.id, item.match])).toEqual([
      ['w1', 'words'],
      ['m1', 'meaning'],
      ['m2', 'meaning'],
    ]);
    expect(meaning.find).toHaveBeenCalledWith('u1', {
      query: 'q',
      folderId: undefined,
      tag: 'x',
      excludeIds: ['w1'],
      limit: 2,
    });
    // The meaning ids are re-read with the user, live and filter conditions.
    const where = findMany.mock.calls[1][0].where;
    expect(where.AND[0]).toMatchObject({ userId: 'u1', deletedAt: null });
    expect(where.AND[1]).toEqual({ id: { in: ['m1', 'm2'] } });
  });

  it('asks the meaning search nothing when the word matches fill the limit', async () => {
    const prisma = {
      link: { findMany: vi.fn().mockResolvedValue([row('w1')]) },
      folder: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const meaning: McpMeaningSearch = { find: vi.fn() };
    await new SearchLinksTool(prisma, meaning).run(PRINCIPAL, { query: 'q', limit: 1 });
    expect(meaning.find).not.toHaveBeenCalled();
  });

  it('skips the re-read when the meaning search finds nothing new', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = {
      link: { findMany },
      folder: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const meaning: McpMeaningSearch = { find: vi.fn().mockResolvedValue([]) };
    await new SearchLinksTool(prisma, meaning).run(PRINCIPAL, { query: 'q', limit: 5 });
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
