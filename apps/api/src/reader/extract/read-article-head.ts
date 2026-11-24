import type { HtmlNode } from '../../preview/models/html-node.type';
import type { ReaderArticleHead } from '../models/reader-article-head.interface';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_META_KEY } from '../models/reader-meta-key.const';
import { cleanText } from './clean-text';
import { attributeOf, childrenOf, isElement, textValue } from './html-tree';

const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.values(READER_META_KEY));
const FIRST_YEAR = 1991;
const URL_LIKE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * An ISO time for a date the page names, or `null` when it does not parse or is out of range
 * (before the web, or more than a day in the future).
 */
export function toPublishedAt(value: string | undefined, now: number): string | null {
  if (value === undefined) return null;
  const time = Date.parse(value.trim());
  if (!Number.isFinite(time)) return null;
  const date = new Date(time);
  if (date.getUTCFullYear() < FIRST_YEAR || time > now + 24 * 60 * 60 * 1000) return null;
  return date.toISOString();
}

/** An author name as the page writes it; a URL (`article:author` is often a profile link) is no name. */
function toAuthor(value: string | undefined): string | null {
  if (value === undefined) return null;
  const name = cleanText(value, READER_EXTRACT_LIMIT.AuthorCharsMax);
  return name === '' || URL_LIKE.test(name) ? null : name;
}

/**
 * Title, author and publication date from `<meta>` tags (`property`, `name` or `itemprop`; the
 * first of each key wins), `<title>` and the first `<time datetime>`. Iterative walk over at most
 * `NodesMax` nodes.
 */
export function readArticleHead(document: HtmlNode, now: number): ReaderArticleHead {
  const meta = new Map<string, string>();
  let title: string | null = null;
  let time: string | undefined;
  let visited = 0;
  const stack: HtmlNode[] = [document];
  while (stack.length > 0 && visited < READER_EXTRACT_LIMIT.NodesMax) {
    const node = stack.pop();
    if (node === undefined) continue;
    visited++;
    if (isElement(node)) {
      if (node.tagName === 'meta') {
        const content = attributeOf(node, 'content');
        const key = [
          attributeOf(node, 'property'),
          attributeOf(node, 'name'),
          attributeOf(node, 'itemprop'),
        ]
          .map((value) => value?.toLowerCase())
          .find((value) => value !== undefined && KNOWN_KEYS.has(value));
        if (key !== undefined && content !== undefined && !meta.has(key)) meta.set(key, content);
        continue;
      }
      if (node.tagName === 'title' && title === null) {
        title = childrenOf(node)
          .map((child) => textValue(child) ?? '')
          .join('');
        continue;
      }
      if (node.tagName === 'time' && time === undefined) {
        time = attributeOf(node, 'datetime');
      }
      if (node.tagName === 'script' || node.tagName === 'style') continue;
    }
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }
  const pageTitle =
    meta.get(READER_META_KEY.OgTitle) ?? meta.get(READER_META_KEY.TwitterTitle) ?? title;
  const cleanTitle =
    pageTitle === null ? '' : cleanText(pageTitle, READER_EXTRACT_LIMIT.TitleCharsMax);
  return {
    title: cleanTitle === '' ? null : cleanTitle,
    author: toAuthor(meta.get(READER_META_KEY.Author) ?? meta.get(READER_META_KEY.ArticleAuthor)),
    publishedAt: toPublishedAt(
      meta.get(READER_META_KEY.Published) ??
        meta.get(READER_META_KEY.DatePublished) ??
        meta.get(READER_META_KEY.Date) ??
        time,
      now,
    ),
  };
}
