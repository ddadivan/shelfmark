import { stripControlChars } from '@shelfmark/contracts';
import { absoluteHttpUrl, clean } from '../extract-preview';
import { PREVIEW_LIMITS } from '../models/preview-limits.const';
import { YOUTUBE_LIMIT } from './models/youtube-limit.const';
import type { YouTubeOembed } from './models/youtube-oembed.interface';

const HTML_TAG = /<[^>]*>/g;
const ABSOLUTE_HTTP = /^https?:\/\//i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Plain text: markup and control characters removed, whitespace collapsed, capped. */
function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  return clean(stripControlChars(value.replace(HTML_TAG, ' ')), maxLength);
}

/**
 * Narrows the untrusted oEmbed JSON (already parsed) to what a preview uses. `null` when it is not
 * an object or has no usable `title`; `author_name` and `thumbnail_url` are optional and dropped
 * when they are not strings, empty, or (the thumbnail) not an absolute http(s) URL without
 * credentials within `PREVIEW_LIMITS.maxUrlLength`.
 */
export function parseYouTubeOembed(raw: unknown): YouTubeOembed | null {
  if (!isRecord(raw)) return null;
  const title = text(raw['title'], PREVIEW_LIMITS.maxTitleLength);
  if (title === null) return null;
  const thumbnail = raw['thumbnail_url'];
  return {
    title,
    authorName: text(raw['author_name'], YOUTUBE_LIMIT.AuthorMax),
    thumbnailUrl:
      typeof thumbnail === 'string' &&
      ABSOLUTE_HTTP.test(thumbnail) &&
      thumbnail.length <= PREVIEW_LIMITS.maxUrlLength
        ? absoluteHttpUrl(thumbnail, YOUTUBE_LIMIT.OembedEndpoint)
        : null,
  };
}
