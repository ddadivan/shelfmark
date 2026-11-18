import {
  AI_SEARCH_LIMIT,
  MEANING_REASON_SOURCE,
  type LinkResponse,
  type MeaningReason,
} from '@shelfmark/contracts';
import type { MockMeaningDoc } from './models/mock-meaning-doc.interface';
import type { MockMeaningRanked } from './models/mock-meaning-ranked.interface';
import { MOCK_MEANING_STOP_WORDS } from './models/mock-meaning-stop-words.const';
import { MOCK_MEANING_SYNONYMS } from './models/mock-meaning-synonyms.const';

const MIN_WORD = 3;
/** Like the API's provider floor and `RelativeWindow`, on the mock's word-overlap scale. */
const MIN_SIMILARITY = 0.08;
const RELATIVE_SHARE = 0.4;
const CLAUSE_SPLIT = /[.;:!?]\s+|,\s+|\s+(?:and|with)\s+/u;

/** Light suffix stripping: "signals" and "signal", "rendering" and "render" become one. */
function strip(word: string): string {
  if (word.length > 5 && word.endsWith('ing')) {
    return word.slice(0, -3);
  }
  if (word.length > 4 && word.endsWith('ed')) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

const SYNONYM_OF: ReadonlyMap<string, string> = new Map(
  MOCK_MEANING_SYNONYMS.flatMap((group) => group.map((word) => [strip(word), strip(group[0])])),
);

/** The stems of a text: lower-case words of 3+ letters, stop words left out, synonyms merged. */
export function meaningStems(text: string): Set<string> {
  const stems = new Set<string>();
  for (const word of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < MIN_WORD || MOCK_MEANING_STOP_WORDS.has(word)) {
      continue;
    }
    const stem = strip(word);
    stems.add(SYNONYM_OF.get(stem) ?? stem);
  }
  return stems;
}

/** What is "embedded" for a link: title, tag names, summary, the note only with `includeNotes`. */
export function meaningDoc(
  link: LinkResponse,
  folderName: string | null,
  includeNotes: boolean,
): MockMeaningDoc {
  const parts = [link.title, link.tags.join(' '), link.summary ?? ''];
  if (includeNotes && link.note !== null) {
    parts.push(link.note);
  }
  return { link, folderName, stems: meaningStems(parts.join('\n')) };
}

function shared(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  let count = 0;
  for (const stem of a) {
    if (b.has(stem)) {
      count++;
    }
  }
  return count;
}

/**
 * The documents closest to `stems`, best first: cosine of the stem sets, above the floor and within
 * a share of the best one, at most `limit`.
 */
export function rankByMeaning(
  stems: ReadonlySet<string>,
  docs: readonly MockMeaningDoc[],
  limit: number,
): MockMeaningRanked[] {
  if (stems.size === 0) {
    return [];
  }
  const scored = docs
    .map((doc) => ({
      doc,
      score:
        doc.stems.size === 0
          ? 0
          : shared(stems, doc.stems) / Math.sqrt(stems.size * doc.stems.size),
    }))
    .filter((item) => item.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  return scored.filter((item) => item.score >= best * RELATIVE_SHARE).slice(0, limit);
}

function cut(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > AI_SEARCH_LIMIT.WhyTextMax
    ? `${trimmed.slice(0, AI_SEARCH_LIMIT.WhyTextMax - 1).trimEnd()}…`
    : trimmed;
}

function clauses(summary: string | null): string[] {
  return (summary ?? '')
    .split(CLAUSE_SPLIT)
    .map((clause) => clause.replace(/[.;:!?]+$/u, '').trim())
    .filter((clause) => clause !== '');
}

function overlaps(text: string, stems: ReadonlySet<string>): boolean {
  return shared(meaningStems(text), stems) > 0;
}

/**
 * "Why it matched" for a search, without a model, like the API: tag names, the folder name and
 * summary clauses that share stems with the query (at most two); else the tags, else the folder,
 * else the first summary clause.
 */
export function searchWhy(doc: MockMeaningDoc, query: ReadonlySet<string>): MeaningReason[] {
  const { link, folderName } = doc;
  const close: MeaningReason[] = [
    ...link.tags
      .filter((tag) => overlaps(tag, query))
      .map((tag) => ({ source: MEANING_REASON_SOURCE.Tag, text: cut(tag) })),
    ...(folderName !== null && overlaps(folderName, query)
      ? [{ source: MEANING_REASON_SOURCE.Folder, text: cut(folderName) }]
      : []),
    ...clauses(link.summary)
      .filter((clause) => overlaps(clause, query))
      .map((clause) => ({ source: MEANING_REASON_SOURCE.Summary, text: cut(clause) })),
  ];
  return close.length > 0 ? close.slice(0, AI_SEARCH_LIMIT.WhyMax) : fallbackWhy(doc);
}

/**
 * "Why it matched" for a related link: shared tag names, then the same folder, then summary clauses
 * that share stems with the source link; else the fallback.
 */
export function relatedWhy(doc: MockMeaningDoc, source: MockMeaningDoc): MeaningReason[] {
  const own = new Set(source.link.tags.map((tag) => tag.toLowerCase()));
  const close: MeaningReason[] = [
    ...doc.link.tags
      .filter((tag) => own.has(tag.toLowerCase()))
      .map((tag) => ({ source: MEANING_REASON_SOURCE.Tag, text: cut(tag) })),
    ...(doc.folderName !== null && doc.link.folderId === source.link.folderId
      ? [{ source: MEANING_REASON_SOURCE.Folder, text: cut(doc.folderName) }]
      : []),
    ...clauses(doc.link.summary)
      .filter((clause) => overlaps(clause, source.stems))
      .map((clause) => ({ source: MEANING_REASON_SOURCE.Summary, text: cut(clause) })),
  ];
  return close.length > 0 ? close.slice(0, AI_SEARCH_LIMIT.WhyMax) : fallbackWhy(doc);
}

function fallbackWhy({ link, folderName }: MockMeaningDoc): MeaningReason[] {
  if (link.tags.length > 0) {
    return link.tags
      .slice(0, AI_SEARCH_LIMIT.WhyMax)
      .map((tag) => ({ source: MEANING_REASON_SOURCE.Tag, text: cut(tag) }));
  }
  if (folderName !== null) {
    return [{ source: MEANING_REASON_SOURCE.Folder, text: cut(folderName) }];
  }
  const first = clauses(link.summary)[0];
  return first === undefined ? [] : [{ source: MEANING_REASON_SOURCE.Summary, text: cut(first) }];
}
