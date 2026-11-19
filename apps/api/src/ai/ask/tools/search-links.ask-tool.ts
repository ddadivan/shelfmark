import { Injectable } from '@nestjs/common';
import { ASK_ACTIVITY } from '@shelfmark/contracts';
import { PrismaService } from '../../../prisma/prisma.service';
import { ASK_MATCH } from '../../models/ask-match.const';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import { ASK_UNTRUSTED_CONTENT_NOTE } from '../../models/ask-untrusted-content-note.const';
import type { AskMatch } from '../../models/ask-match.type';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskSearchArgs } from '../../models/ask-search-args.interface';
import type { AskResolvedFilters } from '../../models/ask-resolved-filters.interface';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { AiProviderRegistry } from '../../providers/ai-provider.registry';
import { MeaningSearchService } from '../../search/meaning-search.service';
import { nearestLinks } from '../../search/nearest-links';
import { fuseRanks } from '../fuse-ranks';
import { askLinkWhere, resolveAskFilters, toAskSearchFilter } from './ask-link-filters';
import { accept, argsObject, onlyKeys, optionalInt, refuse } from './ask-tool-args';
import { loadAskLinks } from './load-ask-links';
import {
  ASK_FILTER_KEYS,
  ASK_FILTER_SCHEMA,
  hasAnyFilter,
  parseAskFilters,
} from './parse-ask-filters';

const KEYS = [...ASK_FILTER_KEYS, 'offset', 'limit'] as const;

/** `search_links` arguments: the shared filters (at least a query or one filter), `offset`, `limit`. */
export function parseSearchLinksArgs(input: unknown): AskParse<AskSearchArgs> {
  const args = argsObject(input);
  if (args === null || !onlyKeys(args, KEYS)) return refuse('Unknown argument');
  const filters = parseAskFilters(args);
  if (!filters.ok) return filters;
  if (!hasAnyFilter(filters.value)) return refuse('Give a query or at least one filter');
  const offset = optionalInt(args['offset'], 0, ASK_TOOL_LIMIT.SearchOffsetMax, 0);
  if (offset === null) {
    return refuse(`offset must be an integer from 0 to ${ASK_TOOL_LIMIT.SearchOffsetMax}`);
  }
  const limit = optionalInt(
    args['limit'],
    1,
    ASK_TOOL_LIMIT.SearchLimitMax,
    ASK_TOOL_LIMIT.SearchLimitDefault,
  );
  if (limit === null) {
    return refuse(`limit must be an integer from 1 to ${ASK_TOOL_LIMIT.SearchLimitMax}`);
  }
  return accept({ filters: filters.value, offset, limit });
}

/**
 * `search_links` (ADR 0055 point 2): with a query, word matches (every word in the title, URL,
 * summary, tag names, the note only with "Include my notes") fused by rank with meaning matches (the
 * AI-3 query vector, only while search by meaning is `ready`, from the shared cache and the
 * `search_queries` allowance; words only otherwise), both under the same filters; without a query,
 * newest first. Every query runs on the session user's live links.
 */
@Injectable()
export class SearchLinksAskTool implements AskTool {
  readonly activity = ASK_ACTIVITY.Search;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.SearchLinks,
    description: `Find the user's saved links. With a query: links containing every word, plus links close in meaning (match "meaning"), best first. Without a query: the newest links matching the filters. Give a query or at least one filter. Use offset for "more". Returns total, hasMore and items with a ref for each link; cite links as [ref]. ${ASK_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        ...ASK_FILTER_SCHEMA,
        offset: { type: 'integer', minimum: 0, maximum: ASK_TOOL_LIMIT.SearchOffsetMax },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: ASK_TOOL_LIMIT.SearchLimitMax,
          default: ASK_TOOL_LIMIT.SearchLimitDefault,
        },
      },
      additionalProperties: false,
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly meaning: MeaningSearchService,
    private readonly registry: AiProviderRegistry,
  ) {}

  async call(context: AskToolContext, input: unknown): Promise<AskToolOutcome> {
    const parsed = parseSearchLinksArgs(input);
    if (!parsed.ok) return { isError: true, data: parsed.message, found: null };
    const userId = context.user.id;
    const resolved = await resolveAskFilters(this.prisma, userId, parsed.value.filters);
    if (!resolved.ok) return { isError: true, data: resolved.message, found: null };
    const { offset, limit } = parsed.value;
    const ranked = await this.rank(context, resolved.value, offset + limit);
    const items = await loadAskLinks(
      this.prisma,
      context,
      ranked.ids.slice(offset, offset + limit),
    );
    const refs = items.map((item) => item.ref);
    return {
      isError: false,
      data: { total: ranked.total, hasMore: ranked.total > offset + items.length, items },
      found: ranked.total,
      search: { total: ranked.total, refs, filter: toAskSearchFilter(resolved.value) },
    };
  }

  /** Ranked ids (at most `wanted`) and the total of matching links. */
  private async rank(
    context: AskToolContext,
    filters: AskResolvedFilters,
    wanted: number,
  ): Promise<{ ids: { id: string; match: AskMatch }[]; total: number }> {
    const userId = context.user.id;
    const where = askLinkWhere(userId, filters, {
      includeNotes: context.includeNotes,
      withWords: true,
    });
    const [total, rows] = await Promise.all([
      this.prisma.link.count({ where }),
      this.prisma.link.findMany({
        where,
        select: { id: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: filters.query === null ? wanted : ASK_TOOL_LIMIT.WordsScanMax,
      }),
    ]);
    const words = rows.map((row) => row.id);
    if (filters.query === null || !context.searchReady) {
      return { ids: words.slice(0, wanted).map((id) => ({ id, match: ASK_MATCH.Words })), total };
    }
    const meaning = await this.meaningMatches(context, filters, filters.query);
    const wordSet = new Set(words);
    const meaningOnly = meaning.filter((id) => !wordSet.has(id));
    const fused = fuseRanks([words, meaning], wanted);
    return {
      ids: fused.map((id) => ({
        id,
        match: wordSet.has(id) ? ASK_MATCH.Words : ASK_MATCH.Meaning,
      })),
      total: total + meaningOnly.length,
    };
  }

  /** Meaning matches above the provider floor that also pass the filters; none on any failure. */
  private async meaningMatches(
    context: AskToolContext,
    filters: AskResolvedFilters,
    query: string,
  ): Promise<string[]> {
    const userId = context.user.id;
    const provider = this.registry.embeddingsFor(context.user);
    const vector = await this.meaning.queryVector(userId, provider, query, context.tier);
    if (typeof vector !== 'string') return [];
    const hits = (await nearestLinks(this.prisma, userId, provider.model, { vector }))
      .filter((hit) => hit.similarity >= provider.minSimilarity)
      .sort((a, b) => b.similarity - a.similarity);
    if (hits.length === 0) return [];
    // The same user, live and filter conditions as the word search: meaning never widens them.
    const allowed = await this.prisma.link.findMany({
      where: {
        AND: [
          askLinkWhere(userId, filters, { includeNotes: context.includeNotes, withWords: false }),
          { id: { in: hits.map((hit) => hit.linkId) } },
        ],
      },
      select: { id: true },
    });
    const ok = new Set(allowed.map((row) => row.id));
    return hits.map((hit) => hit.linkId).filter((id) => ok.has(id));
  }
}
