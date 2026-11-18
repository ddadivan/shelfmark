import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AI_SEARCH_LIMIT,
  AI_SEARCH_STATE,
  LINK_ERROR_MESSAGE,
  type AuthUser,
  type RelatedLinksResponse,
} from '@shelfmark/contracts';
import { LINK_INCLUDE } from '../../links/models/link-include.const';
import { PrismaService } from '../../prisma/prisma.service';
import { AiSearchStatusService } from '../embeddings/ai-search-status.service';
import { AiProviderRegistry } from '../providers/ai-provider.registry';
import { AiSettingsService } from '../settings/ai-settings.service';
import { loadMeaningMatches } from './load-meaning-matches';
import { whyForRelated } from './meaning-why';
import { nearestLinks } from './nearest-links';
import { rankMeaning } from './rank-meaning';

/**
 * `GET /api/links/:id/related` (F7, ADR 0051): the closest other live links of the session user by
 * the link's own stored vector, with the same floor and window as meaning search, without a model
 * call. A trashed, foreign or missing link is 404; with search by meaning off or no current vector
 * for the link the answer has no items, only the status.
 */
@Injectable()
export class RelatedLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AiSettingsService,
    private readonly searchStatus: AiSearchStatusService,
    private readonly registry: AiProviderRegistry,
  ) {}

  async related(user: AuthUser, linkId: string, limit?: number): Promise<RelatedLinksResponse> {
    const userId = user.id;
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId, deletedAt: null },
      include: {
        ...LINK_INCLUDE,
        folder: { select: { name: true, deletedAt: true, userId: true } },
      },
    });
    if (!link) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    const entitlements = await this.settings.entitlements(this.prisma, userId);
    const stored = await this.settings.read(this.prisma, userId);
    const status = await this.searchStatus.status(userId, stored, entitlements.aiTier);
    if (status.state === AI_SEARCH_STATE.Off) return { status, items: [] };

    const provider = this.registry.embeddingsFor(user);
    const vector = await this.prisma.linkEmbedding.findFirst({
      where: { linkId, userId, model: provider.model },
      select: { linkId: true },
    });
    if (!vector) return { status, items: [] };

    const hits = rankMeaning(
      await nearestLinks(this.prisma, userId, provider.model, { linkId }),
      provider.minSimilarity,
    );
    const ids = hits.map((hit) => hit.linkId).slice(0, limit ?? AI_SEARCH_LIMIT.RelatedDefault);
    const origin = {
      title: link.title,
      tagNames: link.tags.map((entry) => entry.tag.name),
      folderId: link.folderId,
      folderName:
        link.folder && link.folder.deletedAt === null && link.folder.userId === userId
          ? link.folder.name
          : null,
      summary: link.summary,
    };
    const items = await loadMeaningMatches(this.prisma, userId, ids, (source) =>
      whyForRelated(origin, source),
    );
    return { status, items };
  }
}
