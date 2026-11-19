import { ALLOWED_PROTOCOLS } from '../../fetcher/models/allowed-protocols.const';
import { YOUTUBE_LIMIT } from './models/youtube-limit.const';

function validId(value: string | null | undefined): string | null {
  return value !== null && value !== undefined && YOUTUBE_LIMIT.VideoIdPattern.test(value)
    ? value
    : null;
}

/** The id when `path` is exactly one id segment (a trailing slash allowed). */
function soleSegment(path: string): string | null {
  const [id, ...rest] = path.split('/');
  return rest.every((part) => part === '') ? validId(id) : null;
}

/**
 * The video id of a YouTube video URL, or `null`: `youtube.com/watch?v=<id>`,
 * `youtube.com/shorts/<id>` (also on `www.` and `m.`) and `youtu.be/<id>`, http or https, any
 * port. The id must be exactly 11 characters of `[A-Za-z0-9_-]`; anything else is not a video.
 */
export function youTubeVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const protocols: readonly string[] = Object.values(ALLOWED_PROTOCOLS);
  if (!protocols.includes(url.protocol) || url.username !== '' || url.password !== '') return null;
  const host = url.hostname.toLowerCase();
  if (host === YOUTUBE_LIMIT.ShortHost) {
    return soleSegment(url.pathname.slice(1));
  }
  const watchHosts: readonly string[] = YOUTUBE_LIMIT.WatchHosts;
  if (!watchHosts.includes(host)) return null;
  if (url.pathname === YOUTUBE_LIMIT.WatchPath || url.pathname === `${YOUTUBE_LIMIT.WatchPath}/`) {
    return validId(url.searchParams.get('v'));
  }
  if (url.pathname.startsWith(YOUTUBE_LIMIT.ShortsPath)) {
    return soleSegment(url.pathname.slice(YOUTUBE_LIMIT.ShortsPath.length));
  }
  return null;
}

/** `https://www.youtube.com/watch?v=<id>` for a valid id. */
export function canonicalYouTubeUrl(id: string): string {
  return `${YOUTUBE_LIMIT.WatchUrl}${id}`;
}
