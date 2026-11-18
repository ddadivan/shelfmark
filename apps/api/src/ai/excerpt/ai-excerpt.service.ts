import { Injectable } from '@nestjs/common';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { extractPreview } from '../../preview/extract-preview';
import { EXCERPT_FETCH_LIMITS } from '../models/excerpt-limit.const';
import { extractExcerpt } from './extract-excerpt';
import type { PageExcerpt } from '../models/page-excerpt.interface';

/**
 * Reads a link's page for an AI job through the SSRF-safe fetcher, with the tighter limits of
 * `EXCERPT_FETCH_LIMITS`. A failed fetch (blocked address, DNS, timeout, size, not HTML) is not a
 * failure of the job: it answers an empty page and the job runs on the URL and title. Never call it
 * inside a database transaction. The page text is never stored or logged.
 */
@Injectable()
export class AiExcerptService {
  constructor(private readonly fetcher: SafeFetcherService) {}

  async load(url: string): Promise<PageExcerpt> {
    try {
      const page = await this.fetcher.fetch(url, EXCERPT_FETCH_LIMITS);
      return {
        excerpt: extractExcerpt(page.body),
        description: extractPreview(page.body, page.finalUrl).description,
      };
    } catch {
      return { excerpt: null, description: null };
    }
  }
}
