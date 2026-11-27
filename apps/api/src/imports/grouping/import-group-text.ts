import type { ImportGroupLink } from '@shelfmark/contracts';
import { stripWww } from '@shelfmark/contracts';
import { IMPORT_GROUPING_LIMIT } from '../models/import-grouping-limit.const';

/** Path segments of a URL that reach the embedding text. */
const PATH_SEGMENTS_MAX = 2;

/** The host (no `www.`) and path of a URL, never its query or fragment; `''` for a broken URL. */
export function importUrlLocation(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    return { host: stripWww(parsed.hostname), path: parsed.pathname };
  } catch {
    return { host: '', path: '' };
  }
}

/**
 * The text embedded for one link of a file: its title, the host of its URL and at most its first
 * two path segments (ADR 0056 decision 10; never the query, the fragment or a deeper path, so
 * tracking, ids and private document names stay out). Control characters become spaces and the
 * text is cut to `EmbedTextMax`.
 */
export function importGroupText(link: ImportGroupLink): string {
  const { host, path } = importUrlLocation(link.url);
  const segments = path.split('/').filter((segment) => segment !== '');
  const where = [host, ...segments.slice(0, PATH_SEGMENTS_MAX)].join('/');
  return Array.from(`${link.title} ${where}`.replace(/[\p{Cc}\s]+/gu, ' ').trim())
    .slice(0, IMPORT_GROUPING_LIMIT.EmbedTextMax)
    .join('');
}
