import { Injectable } from '@nestjs/common';
import type { FetchLimits } from '../fetcher/models/fetch-limits.interface';
import { SafeFetcherService } from '../fetcher/safe-fetcher.service';
import { extractPreview, fallbackPreview } from '../preview/extract-preview';
import type { PageLoad } from './models/page-load.interface';
import { PREVIEW_FETCH_LIMITS } from './models/preview-fetch-limits.const';

/**
 * Loads a page for a preview through the SSRF-safe fetcher. Every failure (blocked address, DNS,
 * timeout, size, non-HTML, parse error) gives the same fallback, so the answer cannot be used to
 * probe which internal hosts exist. Never call it inside a database transaction.
 */
@Injectable()
export class LinkPreviewService {
  constructor(private readonly fetcher: SafeFetcherService) {}

  async load(url: string, limits: Partial<FetchLimits> = PREVIEW_FETCH_LIMITS): Promise<PageLoad> {
    try {
      const page = await this.fetcher.fetch(url, limits);
      return { preview: extractPreview(page.body, page.finalUrl), fetched: true };
    } catch {
      return { preview: fallbackPreview(url), fetched: false };
    }
  }
}
