import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  AI_SEARCH_LIMIT,
  AI_SEARCH_STATE,
  type AiTier,
  type AuthUser,
  type MeaningSearchResponse,
} from '@shelfmark/contracts';
import { buildLinkWhere } from '../../links/link-where';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSearchStatusService } from '../embeddings/ai-search-status.service';
import { toVectorLiteral } from '../embeddings/embedding-sql';
import { EMBEDDING_INPUT_TYPE } from '../models/embedding-input-type.const';
import type { EmbeddingProvider } from '../models/embedding-provider.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiSettingsService } from '../settings/ai-settings.service';
import { AiUsageService } from '../usage/ai-usage.service';
import { loadMeaningMatches } from './load-meaning-matches';
import { whyForQuery } from './meaning-why';
import { nearestLinks } from './nearest-links';
import { QueryEmbeddingCache } from './query-embedding-cache.service';
import { rankMeaning } from './rank-meaning';

/** The query as it is embedded and cached: trimmed, inner whitespace collapsed. */
export function normalizeMeaningQuery(q: string): string {
  return q.replace(/\s+/gu, ' ').trim();
}

/**
 * `GET /api/ai/search` (F3, ADR 0050 point 6): only links found by meaning that are not word matches
 * for the same query, best first, each with "why it matched". Always answers; anything but a ready
 * search (AI or the switch off, under 80% of links ready, a used-up allowance, a provider failure)
 * answers no items and the status, so the web keeps today's word search. The query vector comes
 * from the instance cache or one provider call counted against `search_queries`. Every query runs on
 * the session user's rows; logs carry counts and durations only, never the query.
 */
@Injectable()
export class MeaningSearchService {
  private readonly logger = new Logger(MeaningSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly searchStatus: AiSearchStatusService,
    private readonly usage: AiUsageService,
    private readonly registry: AiProviderRegistry,
    private readonly cache: QueryEmbeddingCache,
  ) {}

  async search(user: AuthUser, rawQuery: string, limit?: number): Promise<MeaningSearchResponse> {
    const q = normalizeMeaningQuery(rawQuery);
    const length = Array.from(q).length;
    if (length < AI_SEARCH_LIMIT.QueryMinChars || length > AI_SEARCH_LIMIT.QueryMax) {
      throw new BadRequestException([
        `q must be ${AI_SEARCH_LIMIT.QueryMinChars} to ${AI_SEARCH_LIMIT.QueryMax} characters`,
      ]);
    }
    const userId = user.id;
    const entitlements = await this.settings.entitlements(this.prisma, userId);
    const stored = await this.settings.read(this.prisma, userId);
    const status = await this.searchStatus.status(userId, stored, entitlements.aiTier);
    if (status.state !== AI_SEARCH_STATE.Ready) return { status, items: [] };

    const provider = this.registry.embeddingsFor(user);
    const vector = await this.queryVector(userId, provider, q, entitlements.aiTier);
    if (typeof vector !== 'string')
      return { status: { ...status, state: vector.state }, items: [] };

    const started = Date.now();
    const hits = rankMeaning(
      await nearestLinks(this.prisma, userId, provider.model, { vector }),
      provider.minSimilarity,
    );
    const wordMatches = await this.wordMatches(
      userId,
      q,
      hits.map((hit) => hit.linkId),
    );
    const ids = hits
      .map((hit) => hit.linkId)
      .filter((id) => !wordMatches.has(id))
      .slice(0, limit ?? AI_SEARCH_LIMIT.MeaningDefault);
    const items = await loadMeaningMatches(this.prisma, userId, ids, (source) =>
      whyForQuery(q, source),
    );
    this.logger.log(`Meaning search: ${items.length} match(es) in ${Date.now() - started} ms`);
    return { status, items };
  }

  /**
   * The cached or freshly embedded query vector, or the state to answer instead. Also used by Ask
   * retrieval (AI-4): one cache and one `search_queries` allowance for both.
   */
  async queryVector(
    userId: string,
    provider: EmbeddingProvider,
    q: string,
    tier: AiTier,
  ): Promise<
    string | { state: typeof AI_SEARCH_STATE.Quota | typeof AI_SEARCH_STATE.Unavailable }
  > {
    const key = this.cache.key(userId, provider.model, q);
    const cached = this.cache.get(key);
    if (cached !== null) return cached;
    const month = await this.usage.reserveSearchQuery(userId, tier);
    if (month === null) return { state: AI_SEARCH_STATE.Quota };
    const outcome = await provider.embed([q], EMBEDDING_INPUT_TYPE.Query);
    const [first] = outcome.ok ? outcome.vectors : [];
    if (first === undefined) {
      await this.usage.refundSearchQuery(userId, month);
      this.logger.warn('Meaning search: the query could not be embedded');
      return { state: AI_SEARCH_STATE.Unavailable };
    }
    const vector = toVectorLiteral(first);
    this.cache.set(key, vector);
    return vector;
  }

  /** Which of the candidates the word search finds for the same query (they are shown there). */
  private async wordMatches(
    userId: string,
    q: string,
    ids: readonly string[],
  ): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.link.findMany({
      where: { AND: [buildLinkWhere(userId, { q }), { id: { in: [...ids] } }] },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }
}
