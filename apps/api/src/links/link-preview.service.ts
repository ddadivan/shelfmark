import { Injectable } from '@nestjs/common';
import type { FetchLimits } from '../fetcher/models/fetch-limits.interface';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { extractPreview, fallbackPreview } from '../preview/extract-preview';
import { remainingLimits } from '../preview/youtube/remaining-limits';
import { YouTubeOembedService } from '../preview/youtube/youtube-oembed.service';
import { youTubePreview } from '../preview/youtube/youtube-preview';
import type { PageLoad } from './models/page-load.interface';
import { PREVIEW_FETCH_LIMITS } from './models/preview-fetch-limits.const';

/**
 * Loads a page for a preview through the SSRF-safe fetcher. Every failure (blocked address, DNS,
 * timeout, size, non-HTML, parse error) gives the same fallback, so the answer cannot be used to
 * probe which internal hosts exist. A YouTube video asks YouTube's oEmbed first (its page is a
 * consent or bot page for servers); when that fails the page is fetched as usual within what is
 * left of the same budget. Never call it inside a database transaction.
 */
@Injectable()
export class LinkPreviewService {
  constructor(
    private readonly fetcher: SafeFetcherService,
    private readonly youtube: YouTubeOembedService,
  ) {}

  async load(url: string, limits: Partial<FetchLimits> = PREVIEW_FETCH_LIMITS): Promise<PageLoad> {
    let pageLimits: Partial<FetchLimits> | null = limits;
    if (this.youtube.handles(url)) {
      const startedAt = Date.now();
      const video = await this.youtube.lookup(url, limits);
      if (video !== null) return { preview: youTubePreview(video), fetched: true };
      pageLimits = remainingLimits(limits, Date.now() - startedAt);
    }
    if (pageLimits === null) return { preview: fallbackPreview(url), fetched: false };
    try {
      const page = await this.fetcher.fetch(url, pageLimits);
      return { preview: extractPreview(page.body, page.finalUrl), fetched: true };
    } catch {
      return { preview: fallbackPreview(url), fetched: false };
    }
  }
}
