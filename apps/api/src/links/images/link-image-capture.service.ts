import { Injectable } from '@nestjs/common';
import { LINK_IMAGE_KIND, type LinkImageKind } from '@shelfmark/contracts';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { processLinkImage } from './process-link-image';
import {
  CAPTURE_BUDGET_MS,
  CAPTURE_MIN_BUDGET_MS,
  CAPTURE_PROCESSING_RESERVE_MS,
} from './models/capture-budget.const';
import type { CaptureSources } from './models/capture-sources.interface';

/**
 * Best-effort capture of a link's favicon and preview image (ADR 0027): fetch through the
 * SSRF-safe fetcher, re-encode, store. Never throws and never logs URLs; a failed image simply
 * leaves the link without one. Never call it inside a database transaction.
 * The outbound fetches are bounded by the AddLink rate limit of its two callers: `POST /links`
 * (create) and `POST /links/:id/images/capture` (`LinkImageRecaptureService`).
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
    // The whole capture (ownership query, fetches, decoding, writes) races one deadline, so a slow
    // CPU cannot push the request past its timeout. A capture that loses the race may still finish
    // in the background; it only writes complete rows, so that is harmless.
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), time);
    });
    try {
      return await Promise.race([this.run(userId, linkId, sources, time), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async run(
    userId: string,
    linkId: string,
    sources: CaptureSources,
    time: number,
  ): Promise<boolean> {
    try {
      // The images are written with the owner's id: confirm the link is theirs first.
      const owned = await this.prisma.link.count({
        where: { id: linkId, userId, deletedAt: null },
      });
      if (owned === 0) return false;
      const wanted: [LinkImageKind, string][] = [];
      if (sources.faviconSourceUrl !== null) {
        wanted.push([LINK_IMAGE_KIND.Favicon, sources.faviconSourceUrl]);
      }
      if (sources.imageSourceUrl !== null) {
        wanted.push([LINK_IMAGE_KIND.Preview, sources.imageSourceUrl]);
      }
      // Downloads run in parallel (network bound, at most 3 MB each); decoding runs one image at a
      // time, because a decoded image is up to 64 MB and Vercel functions have little memory.
      const downloads = await Promise.all(
        wanted.map(([kind, url]) => this.download(kind, url, time - CAPTURE_PROCESSING_RESERVE_MS)),
      );
      let stored = false;
      for (const download of downloads) {
        if (download !== null && (await this.store(userId, linkId, download))) stored = true;
      }
      return stored;
    } catch {
      return false;
    }
  }

  private async download(
    kind: LinkImageKind,
    sourceUrl: string,
    totalTimeoutMs: number,
  ): Promise<{ kind: LinkImageKind; bytes: Buffer } | null> {
    try {
      const response = await this.fetcher.fetchImage(sourceUrl, { totalTimeoutMs });
      return { kind, bytes: response.bytes };
    } catch {
      // Blocked address, timeout, wrong type: all the same, no image.
      return null;
    }
  }

  private async store(
    userId: string,
    linkId: string,
    download: { kind: LinkImageKind; bytes: Buffer },
  ): Promise<boolean> {
    try {
      const image = await processLinkImage(download.bytes, download.kind);
      if (image === null) return false;
      const data = {
        contentType: image.contentType,
        bytes: new Uint8Array(image.bytes),
        width: image.width,
        height: image.height,
        sha256: image.sha256,
      };
      const kind = download.kind;
      await this.prisma.linkImage.upsert({
        where: { linkId_kind: { linkId, kind } },
        create: { userId, linkId, kind, ...data },
        update: data,
      });
      return true;
    } catch {
      // Link deleted meanwhile, database error: no image.
      return false;
    }
  }
}
