import {
  AI_LIMIT,
  LINK_KIND,
  LINK_LIMIT,
  TAG_LIMIT,
  normalizeTagName,
  stripControlChars,
  type LinkKind,
} from '@shelfmark/contracts';
import { AI_PART } from '../models/ai-part.const';
import type { LinkJobOutput } from '../models/link-job-output.interface';
import type { ParseLinkContext } from '../models/parse-link-context.interface';

/** A new tag: letters, digits and a few joiners; no markup, no separators a tag filter would trip on. */
const NEW_TAG_SHAPE = /^[\p{L}\p{N}][\p{L}\p{N} _.+#-]*$/u;
const HTML_TAG = /<[^>]*>/g;
const KINDS: readonly string[] = Object.values(LINK_KIND);

function isLinkKind(value: string): value is LinkKind {
  return KINDS.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function parseTags(raw: unknown[], context: ParseLinkContext): string[] {
  const byLowerCase = new Map(context.tags.map((tag) => [tag.toLowerCase(), tag]));
  const result: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const own = byLowerCase.get(normalizeTagName(value).toLowerCase());
    if (own !== undefined && !result.includes(own)) result.push(own);
    if (result.length === AI_LIMIT.SuggestedTagsMax) break;
  }
  return result;
}

function parseNewTag(raw: unknown, context: ParseLinkContext): string | null {
  if (typeof raw !== 'string' || raw === '') return null;
  // Lower case like the app's own tag style ("AI-courses" becomes "ai-courses"); `toLowerCase` is
  // locale-insensitive, and the length is checked after it because lower-casing can change it.
  const name = normalizeTagName(stripControlChars(raw)).toLowerCase();
  if (name === '' || name.length > TAG_LIMIT.NameMax || !NEW_TAG_SHAPE.test(name)) return null;
  const exists = context.tags.some((tag) => tag.toLowerCase() === name.toLowerCase());
  return exists ? null : name;
}

/** Valid new tags of one list, up to `max`, skipping names already taken (`taken` grows). */
function parseNewTags(
  raw: unknown[],
  context: ParseLinkContext,
  max: number,
  taken: Set<string>,
): string[] {
  const result: string[] = [];
  for (const value of raw) {
    const name = parseNewTag(value, context);
    if (name !== null && !taken.has(name)) {
      taken.add(name);
      result.push(name);
    }
    if (result.length === max) break;
  }
  return result;
}

function parseSummary(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = stripControlChars(raw.replace(HTML_TAG, ' ')).replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  if (text.length <= AI_LIMIT.SummaryMax) return text;
  const cut = text.slice(0, AI_LIMIT.SummaryMax);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > AI_LIMIT.SummaryMax / 2 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * A draft's cleaned-up title as plain text: markup, control characters and extra whitespace
 * removed, at most `LINK_LIMIT.TitleMax`; dropped when it is empty or only the page title again
 * (compared without case and surrounding whitespace).
 */
function parseTitle(raw: string | null | undefined, page: string | null): string | null {
  if (!raw) return null;
  const text = stripControlChars(raw.replace(HTML_TAG, ' ')).replace(/\s+/g, ' ').trim();
  const cut = text.length > LINK_LIMIT.TitleMax ? text.slice(0, LINK_LIMIT.TitleMax).trim() : text;
  if (cut === '' || cut.toLowerCase() === (page ?? '').trim().toLowerCase()) return null;
  return cut;
}

/**
 * Checks the model's answer before anything is stored. `null` means the answer is unusable (not an
 * object, or a field of the wrong type): the job fails and nothing is shown (ADR 0047). Otherwise
 * only what is trusted survives:
 * - tags only from the user's own names (matched without case, returned as the user spelled them),
 *   at most `AI_LIMIT.SuggestedTagsMax`, no repeats;
 * - up to `AI_LIMIT.NewTagsMax` new tags (`newTags`, the best ones) and `AI_LIMIT.MoreTagsMax` more
 *   (`moreTags`, chips only) that pass the tag rules, have a plain shape, are not an
 *   existing tag and do not repeat each other across both lists, in lower case (existing tags keep the user's own
 *   spelling);
 * - a folder only when its key is one of the keys the job offered;
 * - a summary as plain text: markup, control characters and extra whitespace removed, at most
 *   `AI_LIMIT.SummaryMax`;
 * - a title (drafts only) as plain text, at most `LINK_LIMIT.TitleMax`, never the page title again;
 * - a kind only from `LINK_KIND`;
 * - nothing for a part the job did not ask for.
 */
export function parseLinkOutput(raw: unknown, context: ParseLinkContext): LinkJobOutput | null {
  if (!isRecord(raw)) return null;
  const { tags, newTags, moreTags, folder, summary, title, kind } = raw;
  if (tags !== undefined && !Array.isArray(tags)) return null;
  for (const list of [newTags, moreTags]) {
    if (list !== undefined && list !== null && !Array.isArray(list)) return null;
  }
  if (!isNullableString(folder) || !isNullableString(summary) || !isNullableString(title)) {
    return null;
  }
  if (kind !== null && kind !== undefined && typeof kind !== 'string') return null;

  const wants = (part: (typeof AI_PART)[keyof typeof AI_PART]): boolean =>
    context.parts.includes(part);
  const folderKey =
    wants(AI_PART.Folder) && folder && context.folders.some((candidate) => candidate.key === folder)
      ? folder
      : null;
  // One set across both lists: the best tags come first, a repeat is never offered twice.
  const taken = new Set<string>();
  const wantsTags = wants(AI_PART.Tags);
  const best =
    wantsTags && Array.isArray(newTags)
      ? parseNewTags(newTags, context, AI_LIMIT.NewTagsMax, taken)
      : [];
  const more =
    wantsTags && Array.isArray(moreTags)
      ? parseNewTags(moreTags, context, AI_LIMIT.MoreTagsMax, taken)
      : [];
  return {
    tags: wants(AI_PART.Tags) && tags ? parseTags(tags, context) : [],
    newTags: best,
    moreTags: more,
    folder: folderKey,
    summary: wants(AI_PART.Summary) ? parseSummary(summary) : null,
    title: context.title.wanted ? parseTitle(title, context.title.page) : null,
    kind: typeof kind === 'string' && isLinkKind(kind) ? kind : null,
  };
}
