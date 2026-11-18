import { AI_LIMIT, LINK_KIND, TAG_LIMIT, normalizeTagName } from '@shelfmark/contracts';
import type { LinkKind } from '@shelfmark/contracts';
import { stripControlChars } from '../../common/validation/has-control-chars';
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

function parseNewTag(raw: string | null | undefined, context: ParseLinkContext): string | null {
  if (!raw) return null;
  const name = normalizeTagName(stripControlChars(raw));
  if (name === '' || name.length > TAG_LIMIT.NameMax || !NEW_TAG_SHAPE.test(name)) return null;
  const exists = context.tags.some((tag) => tag.toLowerCase() === name.toLowerCase());
  return exists ? null : name;
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
 * Checks the model's answer before anything is stored. `null` means the answer is unusable (not an
 * object, or a field of the wrong type): the job fails and nothing is shown (ADR 0047). Otherwise
 * only what is trusted survives:
 * - tags only from the user's own names (matched without case, returned as the user spelled them),
 *   at most `AI_LIMIT.SuggestedTagsMax`, no repeats;
 * - one new tag that passes the tag rules, has a plain shape and is not an existing tag;
 * - a folder only when its key is one of the keys the job offered;
 * - a summary as plain text: markup, control characters and extra whitespace removed, at most
 *   `AI_LIMIT.SummaryMax`;
 * - a kind only from `LINK_KIND`;
 * - nothing for a part the job did not ask for.
 */
export function parseLinkOutput(raw: unknown, context: ParseLinkContext): LinkJobOutput | null {
  if (!isRecord(raw)) return null;
  const { tags, newTag, folder, summary, kind } = raw;
  if (tags !== undefined && !Array.isArray(tags)) return null;
  if (!isNullableString(newTag) || !isNullableString(folder) || !isNullableString(summary)) {
    return null;
  }
  if (kind !== null && kind !== undefined && typeof kind !== 'string') return null;

  const wants = (part: (typeof AI_PART)[keyof typeof AI_PART]): boolean =>
    context.parts.includes(part);
  const folderKey =
    wants(AI_PART.Folder) && folder && context.folders.some((candidate) => candidate.key === folder)
      ? folder
      : null;
  return {
    tags: wants(AI_PART.Tags) && tags ? parseTags(tags, context) : [],
    newTag: wants(AI_PART.Tags) ? parseNewTag(newTag, context) : null,
    folder: folderKey,
    summary: wants(AI_PART.Summary) ? parseSummary(summary) : null,
    kind: typeof kind === 'string' && isLinkKind(kind) ? kind : null,
  };
}
