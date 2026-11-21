import { YOUTUBE_NOCOOKIE_EMBED_BASE } from './youtube-nocookie-embed-base.const';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS: readonly string[] = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];
const SHORT_HOST = 'youtu.be';
const PATH_PREFIXES: readonly string[] = ['/shorts/', '/embed/', '/live/'];

function videoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === SHORT_HOST) {
    return url.pathname.slice(1).split('/')[0] ?? null;
  }
  if (!YOUTUBE_HOSTS.includes(host)) {
    return null;
  }
  if (url.pathname === '/watch') {
    return url.searchParams.get('v');
  }
  const prefix = PATH_PREFIXES.find((p) => url.pathname.startsWith(p));
  return prefix === undefined ? null : (url.pathname.slice(prefix.length).split('/')[0] ?? null);
}

/**
 * The `youtube-nocookie` player address for a YouTube video link (`watch?v=`, `youtu.be/`,
 * `shorts/`, `embed/`, `live/`; the id must be 11 characters of `[A-Za-z0-9_-]`), or `null` for
 * anything else (#553). Only http(s) links count. The id is the only part of the link that reaches
 * the result.
 */
export function toVideoEmbedUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  const id = videoId(url);
  return id !== null && YOUTUBE_ID.test(id) ? `${YOUTUBE_NOCOOKIE_EMBED_BASE}${id}` : null;
}
