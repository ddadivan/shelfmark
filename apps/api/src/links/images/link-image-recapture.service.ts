import { Injectable, NotFoundException } from '@nestjs/common';
import { LINK_ERROR_MESSAGE, type LinkResponse } from '@shelfmark/contracts';
import { REQUEST_TIMEOUT_MS } from '../../common/interceptors/models/request-timeout.const';
import { PrismaService } from '../../prisma/prisma.service';
import { LinkPreviewService } from '../link-preview.service';
import { LINK_INCLUDE } from '../models/link-include.const';
import { toLinkResponse } from '../to-link-response';
import { LinkImageCaptureService } from './link-image-capture.service';
import {
  RECAPTURE_COOLDOWN_MS,
  RECAPTURE_PAGE_FETCH_MS,
  RECAPTURE_RESPONSE_MARGIN_MS,
} from './models/recapture-limits.const';
import type { CaptureSources } from './models/capture-sources.interface';

/**
 * Re-capture of a link's images after its URL changed (ADR 0027 note, #189), behind
 * `POST /api/links/:id/images/capture`. It runs inside that request, within its time budget (a
 * serverless function may be frozen once the response is sent, so nothing runs afterwards). The
 * capture is best effort and never fails the call. Never call it inside a database transaction;
 * it holds no lock while fetching.
 */
@Injectable()
export class LinkImageRecaptureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previews: LinkPreviewService,
    private readonly captures: LinkImageCaptureService,
  ) {}

  /**
   * Claims and runs the capture when the link is pending or past the cooldown, and answers with
   * the link as it is afterwards. A call that loses the claim (cooldown, a concurrent request
   * already runs it) skips the capture and answers the same way. A foreign or missing link is a 404.
   */
  async recapture(userId: string, linkId: string): Promise<LinkResponse> {
    const startedAt = Date.now();
    if (await this.claim(userId, linkId)) await this.run(userId, linkId, startedAt);
    const row = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
      include: LINK_INCLUDE,
    });
    if (!row) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    return toLinkResponse(row);
  }

  private async run(userId: string, linkId: string, startedAt: number): Promise<void> {
    try {
      const link = await this.prisma.link.findFirst({
        where: { id: linkId, userId },
        select: { url: true, normalizedUrl: true, faviconSourceUrl: true, imageSourceUrl: true },
      });
      if (!link) return;
      const sources: CaptureSources = {
        faviconSourceUrl: link.faviconSourceUrl,
        imageSourceUrl: link.imageSourceUrl,
      };
      if (sources.faviconSourceUrl === null && sources.imageSourceUrl === null) {
        // The URL changed, so the old hints were dropped: read them from the new page.
        const { preview, fetched } = await this.previews.load(link.url, {
          totalTimeoutMs: RECAPTURE_PAGE_FETCH_MS,
          maxRedirects: 3,
        });
        if (!fetched) return;
        sources.faviconSourceUrl = preview.faviconUrl;
        sources.imageSourceUrl = preview.imageUrl;
      }
      const left = REQUEST_TIMEOUT_MS - RECAPTURE_RESPONSE_MARGIN_MS - (Date.now() - startedAt);
      const stored = await this.captures.capture(userId, linkId, sources, left);
      if (stored) await this.dropIfUrlChanged(userId, linkId, link.normalizedUrl);
    } catch {
      // Best effort: the link simply stays without images.
    }
  }

  /**
   * One atomic UPDATE: only the request that finds the link pending (`NULL`) or past the cooldown
   * wins, so concurrent requests (several cards, several tabs) capture once. It filters by the
   * session user, so a foreign link claims nothing. Plain SQL so `updated_at` stays as it is: a
   * capture is not an edit.
   */
  private async claim(userId: string, linkId: string): Promise<boolean> {
    const cutoff = new Date(Date.now() - RECAPTURE_COOLDOWN_MS);
    const claimed = await this.prisma.$executeRaw`
      UPDATE links SET capture_attempted_at = date_trunc('milliseconds', now())
      WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid
        AND (capture_attempted_at IS NULL OR capture_attempted_at < ${cutoff})`;
    return claimed > 0;
  }

  /**
   * A PATCH that changed the URL while the capture ran has already deleted the images: drop what
   * the capture wrote meanwhile, it belongs to the old page.
   */
  private async dropIfUrlChanged(
    userId: string,
    linkId: string,
    normalizedUrl: string,
  ): Promise<void> {
    const current = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
      select: { normalizedUrl: true },
    });
    if (current?.normalizedUrl !== normalizedUrl) {
      await this.prisma.linkImage.deleteMany({ where: { linkId, userId } });
    }
  }
}
