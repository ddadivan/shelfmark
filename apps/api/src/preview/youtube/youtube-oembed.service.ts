import { Inject, Injectable } from '@nestjs/common';
import type { FetchLimits } from '../../fetcher/models/fetch-limits.interface';
import { SafeFetcherService } from '../../fetcher/safe-fetcher.service';
import { YOUTUBE_OEMBED_ENDPOINT } from './models/youtube-oembed-endpoint.token';
import type { YouTubeVideo } from './models/youtube-video.interface';
import { parseYouTubeOembed } from './parse-youtube-oembed';
import { canonicalYouTubeUrl, youTubeVideoId } from './youtube-video-id';

/**
 * YouTube serves datacenter clients a consent or bot page instead of the video page, so a preview
 * of a video asks YouTube's official oEmbed endpoint instead, through the SSRF-safe fetcher in JSON
 * mode. Shared by the link preview and the AI page excerpt. Never throws: `null` for a URL that is
 * not a YouTube video and for every failure (network, non-200, not JSON, bad JSON, no title), so
 * the caller falls back to its normal page fetch. Never call it inside a database transaction.
 */
@Injectable()
export class YouTubeOembedService {
  constructor(
    private readonly fetcher: SafeFetcherService,
    @Inject(YOUTUBE_OEMBED_ENDPOINT) private readonly endpoint: string,
  ) {}

  /** Whether `url` is a YouTube video URL this service would look up. */
  handles(url: string): boolean {
    return youTubeVideoId(url) !== null;
  }

  /** `limits` can only tighten the JSON mode defaults (64 KB, 3 s, 2 redirects). */
  async lookup(url: string, limits?: Partial<FetchLimits>): Promise<YouTubeVideo | null> {
    const id = youTubeVideoId(url);
    if (id === null) return null;
    const canonicalUrl = canonicalYouTubeUrl(id);
    const request = `${this.endpoint}?url=${encodeURIComponent(canonicalUrl)}&format=json`;
    try {
      const response = await this.fetcher.fetchJson(request, limits);
      const oembed = parseYouTubeOembed(JSON.parse(response.body) as unknown);
      return oembed === null ? null : { id, canonicalUrl, ...oembed };
    } catch {
      return null;
    }
  }
}
