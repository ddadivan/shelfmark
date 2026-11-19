import { linkHost } from '@shelfmark/contracts';
import { toLinkKind } from '../../../links/to-link-kind';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import type { AskLinkRow } from '../../models/ask-link-row.type';
import type { AskMatch } from '../../models/ask-match.type';
import type { AskToolLink } from '../../models/ask-tool-link.interface';

function cut(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
}

/** Host without `www.` and the path, never the query, fragment or credentials. */
export function askSite(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./u, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return cut(`${host}${path}`, ASK_TOOL_LIMIT.SiteFieldMax);
  } catch {
    return cut(linkHost(url) ?? '', ASK_TOOL_LIMIT.SiteFieldMax);
  }
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The only way a link reaches the Ask model (ADR 0055 point 3), pinned by a test: the allow-listed
 * fields with caps, the folder path, at most ten tag names, the ref instead of the id. `detail`
 * (`get_link`) adds the longer summary, the note (only with `includeNotes`) and the last open day.
 * Callers pass live links of the session user only.
 */
export function toAskToolLink(
  row: AskLinkRow,
  ref: number,
  folderPaths: ReadonlyMap<string, string>,
  options: { includeNotes: boolean; detail?: boolean; match?: AskMatch },
): AskToolLink {
  const summaryMax = options.detail
    ? ASK_TOOL_LIMIT.SummaryDetailMax
    : ASK_TOOL_LIMIT.SummaryListMax;
  const link: AskToolLink = {
    ref,
    title: cut(row.title, ASK_TOOL_LIMIT.TitleMax),
    site: askSite(row.url),
    folder: row.folderId === null ? null : (folderPaths.get(row.folderId) ?? null),
    tags: row.tags
      .map((entry) => entry.tag.name)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .slice(0, ASK_TOOL_LIMIT.TagsPerLinkMax),
    kind: toLinkKind(row.kind),
    favorite: row.isFavorite,
    savedOn: day(row.createdAt),
    summary: row.summary === null ? null : cut(row.summary, summaryMax),
  };
  if (options.match !== undefined) link.match = options.match;
  if (options.detail) {
    link.note =
      options.includeNotes && row.note !== null
        ? cut(row.note, ASK_TOOL_LIMIT.NoteDetailMax)
        : null;
    link.lastOpenedOn = row.lastOpenedAt === null ? null : day(row.lastOpenedAt);
  }
  return link;
}
