import { Injectable } from '@nestjs/common';
import { ASK_LIMIT, type AiTier, type AuthUser } from '@shelfmark/contracts';
import { escapeLike } from '../../common/util/escape-like';
import type { Prisma } from '../../generated/prisma/client';
import { buildLinkWhere } from '../../links/link-where';
import { PrismaService } from '../../prisma/prisma.service';
import { ASK_RETRIEVAL_LIMIT } from '../models/ask-retrieval-limit.const';
import type { AskPromptSource } from '../models/ask-prompt-source.interface';
import type { AskRetrieval } from '../models/ask-retrieval.interface';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { MeaningSearchService } from '../search/meaning-search.service';
import { nearestLinks } from '../search/nearest-links';
import { askKeywords } from './ask-keywords';
import { fuseRanks } from './fuse-ranks';

function siteOf(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname.replace(/^www\./u, ''), path: parsed.pathname };
  } catch {
    return { host: '', path: '/' };
  }
}

/**
 * Ask retrieval without a model (ADR 0051 point 3), every query on the session user's live links:
 * meaning matches (the AI-3 query vector from the shared cache or one counted embedding, KNN above
 * the provider's floor) only while search by meaning is `ready`, and word matches (topic words of
 * the question over title, URL, summary, tag names and, with `includeNotes`, the note), fused by reciprocal rank, at most
 * `ASK_LIMIT.ContextLinksMax`. A failed or used-up query embedding falls back to words only.
 */
@Injectable()
export class AskRetrievalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meaning: MeaningSearchService,
    private readonly registry: AiProviderRegistry,
  ) {}

  async retrieve(
    user: AuthUser,
    question: string,
    options: { searchReady: boolean; tier: AiTier; includeNotes: boolean },
  ): Promise<AskRetrieval> {
    const [meaning, words] = await Promise.all([
      options.searchReady ? this.meaningMatches(user, question, options.tier) : [],
      this.wordMatches(user.id, question, options.includeNotes),
    ]);
    const ids = fuseRanks([meaning, words], ASK_LIMIT.ContextLinksMax);
    const sources = await this.loadSources(user.id, ids, options.includeNotes);
    return {
      sources: sources.map((entry) => entry.source),
      linkIds: sources.map((entry) => entry.linkId),
      meaningMatches: meaning.length,
      wordMatches: words.length,
    };
  }

  private async meaningMatches(user: AuthUser, question: string, tier: AiTier): Promise<string[]> {
    const provider = this.registry.embeddingsFor(user);
    const vector = await this.meaning.queryVector(user.id, provider, question, tier);
    if (typeof vector !== 'string') return [];
    const hits = await nearestLinks(this.prisma, user.id, provider.model, { vector });
    return hits
      .filter((hit) => hit.similarity >= provider.minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, ASK_RETRIEVAL_LIMIT.MeaningMax)
      .map((hit) => hit.linkId);
  }

  /**
   * Live links matching any topic word, ranked by how many words match, then newest first. The note
   * is matched only with `includeNotes`, so a note never pulls a link in while the switch is off.
   */
  private async wordMatches(
    userId: string,
    question: string,
    includeNotes: boolean,
  ): Promise<string[]> {
    const keywords = askKeywords(question);
    if (keywords.length === 0) return [];
    const anyWord: Prisma.LinkWhereInput[] = keywords.flatMap((word) => {
      const escaped = escapeLike(word);
      return [
        buildLinkWhere(userId, { q: word }, { searchNotes: includeNotes }),
        { summary: { contains: escaped, mode: 'insensitive' } },
        {
          tags: {
            some: { tag: { userId, name: { contains: escaped, mode: 'insensitive' } } },
          },
        },
      ];
    });
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, OR: anyWord },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: ASK_RETRIEVAL_LIMIT.WordsScanMax,
      select: {
        id: true,
        title: true,
        note: true,
        url: true,
        summary: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    return rows
      .map((row, order) => {
        const haystack = [
          row.title,
          includeNotes ? (row.note ?? '') : '',
          row.url,
          row.summary ?? '',
          ...row.tags.map((entry) => entry.tag.name),
        ]
          .join(' ')
          .toLowerCase();
        const hits = keywords.filter((word) => haystack.includes(word)).length;
        return { id: row.id, hits, order };
      })
      .sort((a, b) => b.hits - a.hits || a.order - b.order)
      .slice(0, ASK_RETRIEVAL_LIMIT.WordsMax)
      .map((entry) => entry.id);
  }

  /** The prompt fields of the user's live links in `ids` order, numbered from 1. */
  private async loadSources(
    userId: string,
    ids: readonly string[],
    includeNotes: boolean,
  ): Promise<{ linkId: string; source: AskPromptSource }[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: [...ids] } },
      select: {
        id: true,
        title: true,
        url: true,
        note: true,
        summary: true,
        createdAt: true,
        folderId: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    const folderIds = [...new Set(rows.flatMap((row) => (row.folderId ? [row.folderId] : [])))];
    const folders =
      folderIds.length === 0
        ? []
        : await this.prisma.folder.findMany({
            where: { userId, deletedAt: null, id: { in: folderIds } },
            select: { id: true, name: true },
          });
    const folderName = new Map(folders.map((folder) => [folder.id, folder.name]));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const found = ids.flatMap((id) => {
      const row = byId.get(id);
      return row === undefined ? [] : [row];
    });
    return found.map((row, index) => ({
      linkId: row.id,
      source: {
        n: index + 1,
        title: row.title,
        ...siteOf(row.url),
        folderName: row.folderId === null ? null : (folderName.get(row.folderId) ?? null),
        tagNames: row.tags.map((entry) => entry.tag.name).sort(),
        summary: row.summary,
        savedAt: row.createdAt,
        note: includeNotes ? row.note : null,
      },
    }));
  }
}
