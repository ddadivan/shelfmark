import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LINK_ERROR_MESSAGE,
  LINK_KIND,
  type ReaderArticle,
  type ReaderArticleResponse,
} from '@shelfmark/contracts';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { readLinkSavePrefs } from '../links/link-save-prefs';
import { PrismaService } from '../prisma/prisma.service';
import { extractReaderArticle } from './extract/extract-reader-article';
import { READER_CACHE } from './models/reader-cache.const';
import { READER_FETCH_LIMITS } from './models/reader-fetch-limits.const';
import type { ReaderFetchOutcome } from './models/reader-fetch-outcome.interface';
import { parseStoredArticle } from './parse-stored-article';

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;
const NO_ARTICLE: ReaderArticleResponse = { article: null };

/**
 * Reader text of the session user's own live link (`READER_ENDPOINT.Article`). A stored result
 * (`link_reader_articles`) is answered without a request; otherwise the page is fetched through
 * `SafeFetcherService` (never inside a transaction), extracted with parse5 into typed blocks and
 * stored, but only while the link still has the URL that was fetched. "Fetch previews" off answers
 * no article without any request; a video answers none without one too (its page is a player). A
 * failed fetch is stored as failed and asked again after `READER_CACHE.FailedRetryMs`. Logs never
 * carry the URL or the text.
 */
@Injectable()
export class ReaderArticleService {
  private readonly logger = new Logger(ReaderArticleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fetcher: SafeFetcherService,
  ) {}

  /** A foreign, missing or trashed link is the same 404. */
  async article(userId: string, linkId: string): Promise<ReaderArticleResponse> {
    const link = await this.prisma.link.findFirst({
      where: { id: linkId, userId, deletedAt: null },
      select: { url: true, title: true, kind: true },
    });
    if (!link) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    if (!(await readLinkSavePrefs(this.prisma, userId)).fetchPreviews) return NO_ARTICLE;

    const stored = await this.prisma.linkReaderArticle.findFirst({
      where: { linkId, userId },
      select: { article: true, failed: true, extractedAt: true },
    });
    if (stored) {
      if (!stored.failed && stored.article === null) return NO_ARTICLE;
      const article = stored.failed ? null : parseStoredArticle(stored.article);
      if (article !== null) return { article };
      const retryDue = Date.now() - stored.extractedAt.getTime() >= READER_CACHE.FailedRetryMs;
      if (stored.failed && !retryDue) return NO_ARTICLE;
    }
    if (link.kind === LINK_KIND.Video) return NO_ARTICLE;

    const outcome = await this.load(link.url, link.title);
    await this.store(userId, linkId, link.url, outcome);
    return { article: outcome.article };
  }

  private async load(url: string, title: string): Promise<ReaderFetchOutcome> {
    const startedAt = Date.now();
    try {
      const page = await this.fetcher.fetch(url, READER_FETCH_LIMITS);
      if (page.status < HTTP_OK_MIN || page.status > HTTP_OK_MAX) {
        return { article: null, failed: true };
      }
      const article = extractReaderArticle(page.body, title);
      this.logger.log(
        `Reader extraction: ${article === null ? 'none' : `${article.blocks.length} blocks`} in ${Date.now() - startedAt} ms`,
      );
      return { article, failed: false };
    } catch (error) {
      // A blocked address, DNS, timeout, size or a page that is not HTML: no article for now.
      this.logger.log(`Reader fetch failed: ${error instanceof Error ? error.name : 'unknown'}`);
      return { article: null, failed: true };
    }
  }

  /**
   * One statement: written only for the user's live link that still has the fetched URL (a URL
   * change meanwhile deleted the old row and must not get it back), replacing an older result.
   */
  private async store(
    userId: string,
    linkId: string,
    url: string,
    outcome: ReaderFetchOutcome,
  ): Promise<void> {
    const json =
      outcome.article === null ? null : JSON.stringify(outcome.article satisfies ReaderArticle);
    await this.prisma.$executeRaw`
      INSERT INTO link_reader_articles (link_id, user_id, article, failed, extracted_at)
      SELECT l.id, l.user_id, ${json}::jsonb, ${outcome.failed}, now()
      FROM links l
      WHERE l.id = ${linkId}::uuid AND l.user_id = ${userId}::uuid
        AND l.deleted_at IS NULL AND l.url = ${url}
      ON CONFLICT (link_id) DO UPDATE
        SET article = EXCLUDED.article, failed = EXCLUDED.failed, extracted_at = EXCLUDED.extracted_at`;
  }
}
