import { AI_SEARCH_LIMIT, MEANING_REASON_SOURCE, type MeaningReason } from '@shelfmark/contracts';
import type { WhySource } from '../models/why-source.interface';
import { wordStems } from './word-stems';

const CLAUSE_BREAK = /(?<=[.!?;:])\s+|,\s+/u;

/** Plain text of one reason, at most `AI_SEARCH_LIMIT.WhyTextMax` characters. */
export function clipReason(text: string): string {
  const clean = text.replace(/\s+/gu, ' ').trim();
  const chars = Array.from(clean);
  if (chars.length <= AI_SEARCH_LIMIT.WhyTextMax) return clean;
  return `${chars
    .slice(0, AI_SEARCH_LIMIT.WhyTextMax - 1)
    .join('')
    .trimEnd()}…`;
}

/** The summary split into clauses (sentences and comma parts). */
export function summaryClauses(summary: string | null): string[] {
  return (summary ?? '')
    .split(CLAUSE_BREAK)
    .map((clause) => clause.trim().replace(/[.!?;:]+$/u, ''))
    .filter((clause) => clause !== '');
}

function reason(source: MeaningReason['source'], text: string): MeaningReason {
  return { source, text: clipReason(text) };
}

function sharesStem(text: string, stems: ReadonlySet<string>): boolean {
  return wordStems(text).some((stem) => stems.has(stem));
}

/** Without a shared word: the link's tags, else its folder, else the first summary clause. */
export function fallbackWhy(source: WhySource): MeaningReason[] {
  if (source.tagNames.length > 0) {
    return source.tagNames
      .slice(0, AI_SEARCH_LIMIT.WhyMax)
      .map((name) => reason(MEANING_REASON_SOURCE.Tag, name));
  }
  if (source.folderName !== null) return [reason(MEANING_REASON_SOURCE.Folder, source.folderName)];
  const [first] = summaryClauses(source.summary);
  return first === undefined ? [] : [reason(MEANING_REASON_SOURCE.Summary, first)];
}

/** Tag names, folder name and summary clauses that share a word stem with `stems`, in that order. */
function matching(source: WhySource, stems: ReadonlySet<string>): MeaningReason[] {
  return [
    ...source.tagNames
      .filter((name) => sharesStem(name, stems))
      .map((name) => reason(MEANING_REASON_SOURCE.Tag, name)),
    ...(source.folderName !== null && sharesStem(source.folderName, stems)
      ? [reason(MEANING_REASON_SOURCE.Folder, source.folderName)]
      : []),
    ...summaryClauses(source.summary)
      .filter((clause) => sharesStem(clause, stems))
      .map((clause) => reason(MEANING_REASON_SOURCE.Summary, clause)),
  ].slice(0, AI_SEARCH_LIMIT.WhyMax);
}

/**
 * "Why it matched" for a meaning search result, without a model (ADR 0052 point 6): the link's tag
 * names, folder name and summary clauses that share stems with the query (at most two), else the
 * fallback.
 */
export function whyForQuery(query: string, source: WhySource): MeaningReason[] {
  const found = matching(source, new Set(wordStems(query)));
  return found.length > 0 ? found : fallbackWhy(source);
}

/**
 * "Why it matched" for a related link: the tag names both links carry, then the same folder, then
 * summary clauses sharing stems with the source link's title and summary, else the fallback.
 */
export function whyForRelated(
  origin: WhySource & { title: string; folderId: string | null },
  other: WhySource & { folderId: string | null },
): MeaningReason[] {
  const originTags = new Set(origin.tagNames.map((name) => name.toLowerCase()));
  const shared = other.tagNames.filter((name) => originTags.has(name.toLowerCase()));
  if (shared.length > 0) {
    return shared
      .slice(0, AI_SEARCH_LIMIT.WhyMax)
      .map((name) => reason(MEANING_REASON_SOURCE.Tag, name));
  }
  if (other.folderId !== null && other.folderId === origin.folderId && other.folderName !== null) {
    return [reason(MEANING_REASON_SOURCE.Folder, other.folderName)];
  }
  const stems = new Set(wordStems(`${origin.title} ${origin.summary ?? ''}`));
  const clauses = summaryClauses(other.summary)
    .filter((clause) => sharesStem(clause, stems))
    .slice(0, AI_SEARCH_LIMIT.WhyMax)
    .map((clause) => reason(MEANING_REASON_SOURCE.Summary, clause));
  return clauses.length > 0 ? clauses : fallbackWhy(other);
}
