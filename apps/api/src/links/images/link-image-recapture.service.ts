import { Injectable } from '@nestjs/common';
import { REQUEST_TIMEOUT_MS } from '../../common/interceptors/models/request-timeout.const';
import { PrismaService } from '../../prisma/prisma.service';
import { LinkPreviewService } from '../link-preview.service';
import { LinkImageCaptureService } from './link-image-capture.service';
import {
  RECAPTURE_COOLDOWN_MS,
  RECAPTURE_PAGE_FETCH_MS,
  RECAPTURE_RESPONSE_MARGIN_MS,
} from './models/recapture-limits.const';
import type { CaptureSources } from './models/capture-sources.interface';

/**
 * Lazy re-capture of a link's images after its URL changed (ADR 0027 note, #189). It runs inside the
 * request of an image route that found no image, within that request's time budget (a serverless
 * function may be frozen once the response is sent, so nothing runs afterwards). Best effort: it
 * never throws. Never call it inside a database transaction; it holds no lock while fetching.
 */
@Injectable()
export class LinkImageRecaptureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly previews: LinkPreviewService,
    private readonly captures: LinkImageCaptureService,
  ) {}

  /** Returns whether at least one image was stored. A foreign or missing link claims nothing. */
  async recapture(userId: string, linkId: string): Promise<boolean> {
    const startedAt = Date.now();
    try {
      if (!(await this.claim(userId, linkId))) return false;
      const link = await this.prisma.link.findFirst({
        where: { id: linkId, userId },
        select: { url: true, normalizedUrl: true, faviconSourceUrl: true, imageSourceUrl: true },
      });
      if (!link) return false;
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
        if (!fetched) return false;
        sources.faviconSourceUrl = preview.faviconUrl;
        sources.imageSourceUrl = preview.imageUrl;
      }
      const left = REQUEST_TIMEOUT_MS - RECAPTURE_RESPONSE_MARGIN_MS - (Date.now() - startedAt);
      const stored = await this.captures.capture(userId, linkId, sources, left);
      if (!stored) return false;
      return await this.keepIfUnchanged(userId, linkId, link.normalizedUrl);
    } catch {
      return false;
    }
  }

  /**
   * One atomic UPDATE: only the request that finds the link pending (`NULL`) or past the cooldown
   * wins, so concurrent image requests (icon and image of one card, several tabs) capture once.
   * Plain SQL so `updated_at` stays as it is: a capture is not an edit.
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
  private async keepIfUnchanged(
    userId: string,
    linkId: string,
    normalizedUrl: string,
  ): Promise<boolean> {
    const current = await this.prisma.link.findFirst({
      where: { id: linkId, userId },
      select: { normalizedUrl: true },
    });
    if (current?.normalizedUrl === normalizedUrl) return true;
    await this.prisma.linkImage.deleteMany({ where: { linkId, userId } });
    return false;
  }
}
