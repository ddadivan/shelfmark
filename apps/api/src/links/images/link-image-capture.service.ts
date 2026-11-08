import { Injectable } from '@nestjs/common';
import { LINK_IMAGE_KIND, type LinkImageKind } from '@shelfmark/contracts';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { processLinkImage } from './process-link-image';
import { CAPTURE_BUDGET_MS, CAPTURE_MIN_BUDGET_MS } from './models/capture-budget.const';
import type { CaptureSources } from './models/capture-sources.interface';

/**
 * Best-effort capture of a link's favicon and preview image (ADR 0027): fetch through the
 * SSRF-safe fetcher, re-encode, store. Never throws and never logs URLs; a failed image simply
 * leaves the link without one. Never call it inside a database transaction.
 */
@Injectable()
export class LinkImageCaptureService {
  constructor(
    private readonly fetcher: SafeFetcherService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * `budgetMs` is what is left of the request: the capture takes at most `CAPTURE_BUDGET_MS` of it
   * and is skipped when less than `CAPTURE_MIN_BUDGET_MS` remains. Returns whether anything was stored.
   */
  async capture(
    userId: string,
    linkId: string,
    sources: CaptureSources,
    budgetMs: number = CAPTURE_BUDGET_MS,
  ): Promise<boolean> {
    const time = Math.min(budgetMs, CAPTURE_BUDGET_MS);
    if (time < CAPTURE_MIN_BUDGET_MS) return false;
    // The images are written with the owner's id: confirm the link is theirs first.
    const owned = await this.prisma.link.count({ where: { id: linkId, userId } });
    if (owned === 0) return false;
    const jobs: Promise<boolean>[] = [];
    if (sources.faviconSourceUrl !== null) {
      jobs.push(
        this.captureOne(userId, linkId, LINK_IMAGE_KIND.Favicon, sources.faviconSourceUrl, time),
      );
    }
    if (sources.imageSourceUrl !== null) {
      jobs.push(
        this.captureOne(userId, linkId, LINK_IMAGE_KIND.Preview, sources.imageSourceUrl, time),
      );
    }
    const stored = await Promise.all(jobs);
    return stored.some(Boolean);
  }

  private async captureOne(
    userId: string,
    linkId: string,
    kind: LinkImageKind,
    sourceUrl: string,
    totalTimeoutMs: number,
  ): Promise<boolean> {
    try {
      const response = await this.fetcher.fetchImage(sourceUrl, { totalTimeoutMs });
      const image = await processLinkImage(response.bytes, kind);
      if (image === null) return false;
      const data = {
        contentType: image.contentType,
        bytes: new Uint8Array(image.bytes),
        width: image.width,
        height: image.height,
        sha256: image.sha256,
      };
      await this.prisma.linkImage.upsert({
        where: { linkId_kind: { linkId, kind } },
        create: { userId, linkId, kind, ...data },
        update: data,
      });
      return true;
    } catch {
      // Blocked address, timeout, wrong type, link deleted meanwhile: all the same, no image.
      return false;
    }
  }
}
