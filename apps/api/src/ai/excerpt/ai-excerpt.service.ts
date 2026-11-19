import { Injectable } from '@nestjs/common';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { extractPreview } from '../../preview/extract-preview';
import { remainingLimits } from '../../preview/youtube/remaining-limits';
import { YouTubeOembedService } from '../../preview/youtube/youtube-oembed.service';
import { youTubeExcerpt } from '../../preview/youtube/youtube-preview';
import { EXCERPT_FETCH_LIMITS } from '../models/excerpt-limit.const';
import { extractExcerpt } from './extract-excerpt';
import type { PageExcerpt } from '../models/page-excerpt.interface';

const NO_PAGE: PageExcerpt = { excerpt: null, description: null };

/**
 * Reads a link's page for an AI job through the SSRF-safe fetcher, with the tighter limits of
 * `EXCERPT_FETCH_LIMITS`. A failed fetch (blocked address, DNS, timeout, size, not HTML) is not a
 * failure of the job: it answers an empty page and the job runs on the URL and title. A YouTube
 * video's page is a consent or bot page for servers, so its oEmbed title and channel are the
 * excerpt ("YouTube video: <title> by <channel>", the channel as description); when oEmbed fails
 * the page is read as usual within what is left of the same budget. Never call it inside a
 * database transaction. The page text is never stored or logged.
 */
@Injectable()
export class AiExcerptService {
  constructor(
    private readonly fetcher: SafeFetcherService,
    private readonly youtube: YouTubeOembedService,
  ) {}

  async load(url: string): Promise<PageExcerpt> {
    let limits = EXCERPT_FETCH_LIMITS;
    if (this.youtube.handles(url)) {
      const startedAt = Date.now();
      const video = await this.youtube.lookup(url, EXCERPT_FETCH_LIMITS);
      if (video !== null) return { excerpt: youTubeExcerpt(video), description: video.authorName };
      const left = remainingLimits(EXCERPT_FETCH_LIMITS, Date.now() - startedAt);
      if (left === null) return NO_PAGE;
      limits = left;
    }
    try {
      const page = await this.fetcher.fetch(url, limits);
      return {
        excerpt: extractExcerpt(page.body),
        description: extractPreview(page.body, page.finalUrl).description,
      };
    } catch {
      return NO_PAGE;
    }
  }
}
