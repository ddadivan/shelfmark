import type { ImportGroupLink } from '@shelfmark/contracts';
import { IMPORT_GROUPING_LIMIT } from '../models/import-grouping-limit.const';

/** The host (no `www.`) and path of a URL, never its query or fragment; `''` for a broken URL. */
export function importUrlLocation(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname.replace(/^www\./u, ''), path: parsed.pathname };
  } catch {
    return { host: '', path: '' };
  }
}

/**
 * The text embedded for one link of a file: its title and the host and path of its URL (ADR 0056
 * decision 10; never the query, so tracking and ids stay out). Control characters become spaces and
 * the text is cut to `EmbedTextMax`.
 */
export function importGroupText(link: ImportGroupLink): string {
  const { host, path } = importUrlLocation(link.url);
  const where = path === '/' ? host : `${host}${path}`;
  return Array.from(`${link.title} ${where}`.replace(/[\p{Cc}\s]+/gu, ' ').trim())
    .slice(0, IMPORT_GROUPING_LIMIT.EmbedTextMax)
    .join('');
}
