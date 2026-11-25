import { HELP_ARTICLES } from '../models/help-articles.const';
import type { HelpSearchResult } from '../models/help-search-result.interface';
import type { HelpArticle } from '../models/help-article.interface';
import { stripHelpInline } from './parse-help-inline';

/** Lower case without accents, so "reminder" finds "Réminder" and "é" matches "e". */
export function foldHelpText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** The words of a query, folded; empty for a blank query. */
export function helpQueryWords(query: string): readonly string[] {
  return foldHelpText(query)
    .split(/\s+/)
    .filter((word) => word !== '');
}

/** Reads a translated text of an article: `text(articleId, key)` with `key` relative to it. */
export type HelpTextReader = (articleId: string, key: string) => string;

interface Scored {
  readonly article: HelpArticle;
  readonly score: number;
  readonly snippet: string;
}

/** The body lines of an article: its lead first, then every text block of its sections. */
function bodyLines(article: HelpArticle, read: HelpTextReader): readonly string[] {
  const lines = [read(article.id, 'lead')];
  for (const section of article.sections) {
    for (const block of section.blocks) {
      for (const key of block.keys) {
        lines.push(read(article.id, key));
      }
    }
  }
  return lines.map(stripHelpInline).filter((line) => line !== '');
}

/**
 * Client-side search over the titles and texts of the help articles: an article matches when every
 * word of the query is found (accent- and case-insensitive) in its title, lead or body. A title
 * hit ranks above a lead hit above a body hit; ties keep the reading order. The snippet is the
 * first line holding a query word (the lead when only the title matched).
 */
export function searchHelp(query: string, read: HelpTextReader): readonly HelpSearchResult[] {
  const words = helpQueryWords(query);
  if (words.length === 0) {
    return [];
  }
  const scored: Scored[] = [];
  for (const article of HELP_ARTICLES) {
    const title = foldHelpText(read(article.id, 'title'));
    const lines = bodyLines(article, read);
    const folded = lines.map(foldHelpText);
    const all = [title, ...folded].join(' ');
    if (!words.every((word) => all.includes(word))) {
      continue;
    }
    const inTitle = words.filter((word) => title.includes(word)).length;
    const inLead = words.filter((word) => (folded[0] ?? '').includes(word)).length;
    const score = inTitle * 4 + inLead * 2 + words.length;
    const hit = folded.findIndex((line) => words.some((word) => line.includes(word)));
    scored.push({ article, score, snippet: lines[Math.max(hit, 0)] ?? '' });
  }
  return scored
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.score - a.entry.score || a.index - b.index)
    .map(({ entry }) => ({ article: entry.article, snippet: entry.snippet }));
}
