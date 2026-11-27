import { LINK_KIND, type LinkKind, stripWww } from '@shelfmark/contracts';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import type { AskFilters } from '../../models/ask-filters.interface';
import type { AskParse } from '../../models/ask-parse.type';
import { accept, optionalText, refuse } from './ask-tool-args';

/** The filter keys shared by `search_links` and `count_links`. */
export const ASK_FILTER_KEYS = [
  'query',
  'folder',
  'tag',
  'kind',
  'site',
  'savedFrom',
  'savedTo',
  'favorite',
] as const;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/u;
const HOST =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u;

/** A real calendar day `YYYY-MM-DD`, else `null`. */
export function parseDay(value: string): string | null {
  const match = DAY.exec(value);
  if (match === null) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

/** A host as the model may write it: scheme, `www.`, path and port dropped, lower case. */
export function parseSite(value: string): string | null {
  const host = stripWww(
    value
      .toLowerCase()
      .replace(/^[a-z]+:\/\//u, '')
      .replace(/[/?#:].*$/u, ''),
  );
  return HOST.test(host) ? host : null;
}

function isLinkKind(value: unknown): value is LinkKind {
  return Object.values<unknown>(LINK_KIND).includes(value);
}

/**
 * The shared filters of `search_links` and `count_links` (ADR 0055 point 2): names for folder (a path
 * like `Parent / Child`) and tag, `kind` from `LINK_KIND`, `site` a host, UTC days with
 * `savedFrom <= savedTo`, `favorite` a boolean. Messages are fixed text that never repeat the input.
 */
export function parseAskFilters(args: Record<string, unknown>): AskParse<AskFilters> {
  const query = optionalText(args['query'], ASK_TOOL_LIMIT.QueryMax);
  if (!query.ok)
    return refuse(`query must be text of at most ${ASK_TOOL_LIMIT.QueryMax} characters`);
  const folder = optionalText(args['folder'], ASK_TOOL_LIMIT.FilterNameMax);
  if (!folder.ok) return refuse('folder must be a folder path from list_folders');
  const tag = optionalText(args['tag'], ASK_TOOL_LIMIT.FilterNameMax);
  if (!tag.ok) return refuse('tag must be a tag name from list_tags');
  const kind = args['kind'];
  if (kind !== undefined && kind !== null && !isLinkKind(kind)) {
    return refuse(`kind must be one of ${Object.values(LINK_KIND).join(', ')}`);
  }
  const siteText = optionalText(args['site'], ASK_TOOL_LIMIT.SiteMax);
  const site = siteText.ok && siteText.value !== null ? parseSite(siteText.value) : null;
  if (!siteText.ok || (siteText.value !== null && site === null)) {
    return refuse('site must be a host such as example.com');
  }
  const days: (string | null)[] = [];
  for (const key of ['savedFrom', 'savedTo'] as const) {
    const value = args[key];
    if (value === undefined || value === null) {
      days.push(null);
      continue;
    }
    const parsed = typeof value === 'string' ? parseDay(value) : null;
    if (parsed === null) return refuse(`${key} must be a date YYYY-MM-DD (UTC)`);
    days.push(parsed);
  }
  const [savedFrom = null, savedTo = null] = days;
  if (savedFrom !== null && savedTo !== null && savedFrom > savedTo) {
    return refuse('savedFrom must not be after savedTo');
  }
  const favorite = args['favorite'];
  if (favorite !== undefined && favorite !== null && typeof favorite !== 'boolean') {
    return refuse('favorite must be true or false');
  }
  return accept({
    query: query.value,
    folder: folder.value,
    tag: tag.value,
    kind: isLinkKind(kind) ? kind : null,
    site,
    savedFrom,
    savedTo,
    favorite: typeof favorite === 'boolean' ? favorite : null,
  });
}

/** Whether the filters narrow anything at all (a query or one filter). */
export function hasAnyFilter(filters: AskFilters): boolean {
  return Object.values(filters).some((value) => value !== null);
}

/** JSON Schema properties of the shared filters (tool definitions). */
export const ASK_FILTER_SCHEMA = {
  query: {
    type: 'string',
    maxLength: ASK_TOOL_LIMIT.QueryMax,
    description:
      'Words that must all appear in the title, address, summary or tags (or the note when the user allows notes). Use one to three distinctive words, not a sentence.',
  },
  folder: {
    type: 'string',
    description:
      'Folder path from list_folders, e.g. "Work / Angular"; only the links directly in it.',
  },
  tag: { type: 'string', description: 'A tag name from list_tags.' },
  kind: { type: 'string', enum: Object.values(LINK_KIND) },
  site: { type: 'string', description: 'A host such as youtube.com (www. is ignored).' },
  savedFrom: { type: 'string', description: 'First day saved, YYYY-MM-DD, UTC.' },
  savedTo: { type: 'string', description: 'Last day saved (inclusive), YYYY-MM-DD, UTC.' },
  favorite: { type: 'boolean', description: 'Only favourites (true) or only others (false).' },
} as const;
