import {
  READER_ARTICLE_VERSION,
  READER_BLOCK_KIND,
  type ReaderArticle,
  type ReaderBlock,
} from '@shelfmark/contracts';
import { parse } from 'parse5';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import type { HtmlElement } from '../../preview/models/html-element.type';
import type { ReaderWalkOptions } from '../models/reader-walk-options.interface';
import { cleanText, countWords } from './clean-text';
import { BlockCollector } from './collect-blocks';
import { findContentRoot } from './find-content-root';
import { findRootCandidates } from './find-root-candidates';
import { childrenOf, isElement, measureText } from './html-tree';
import { toBaseUrl } from './resolve-url';
import { sameText } from './same-text';
import { readArticleHead } from './read-article-head';

const FALLBACK_ROOTS: readonly string[] = ['article', 'main'];
/** Nodes all attempts of one extraction may visit together (each attempt has its own `NodesMax`). */
const TOTAL_NODES_MAX = 300_000;
const PASSES: readonly ReaderWalkOptions[] = [{ skipUnlikely: true }, { skipUnlikely: false }];

function findFirst(root: HtmlNode, tag: string): HtmlNode | null {
  let visited = 0;
  const stack: HtmlNode[] = [root];
  while (stack.length > 0 && visited < READER_EXTRACT_LIMIT.NodesMax) {
    const node = stack.pop();
    if (node === undefined) continue;
    visited++;
    if (isElement(node) && node.tagName === tag) return node;
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }
  return null;
}

function itemWords(items: ReaderBlock['items']): number {
  return items.reduce(
    (sum, item) =>
      sum + countWords(item.spans.map((span) => span.text).join('')) + itemWords(item.items),
    0,
  );
}

function wordsOf(blocks: readonly ReaderBlock[]): number {
  return blocks.reduce(
    (sum, block) =>
      sum +
      countWords(block.text) +
      itemWords(block.items) +
      block.rows.reduce((rows, row) => rows + countWords(row.join(' ')), 0),
    0,
  );
}

/** Chars of a line before the first real paragraph that still counts as byline. */
const BYLINE_CHARS_MAX = 80;
const SENTENCE_END = /[.!?…:"”»]$/;
/** A repeated block shorter than this is kept ("Details", a price). */
const REPEAT_CHARS_MIN = 40;
const TEXT_KINDS: ReadonlySet<string> = new Set([
  READER_BLOCK_KIND.Paragraph,
  READER_BLOCK_KIND.List,
  READER_BLOCK_KIND.Quote,
  READER_BLOCK_KIND.Note,
  READER_BLOCK_KIND.Table,
]);
const TITLE_SEPARATOR = /\s[|–—•·-]\s/;
const TITLE_TAIL = /\s[|–—•·-]\s*$/;
const NOT_ALPHANUMERIC = /[^a-z0-9]/g;

/** The first `<h1>` in the root or in the nearest ancestor that has one (a title in the page header). */
function findTitleH1(root: HtmlNode): string | null {
  let node: HtmlNode | null = root;
  for (
    let level = 0;
    level < 6 && node !== null && isElement(node) && node.tagName !== 'body';
    level++
  ) {
    const h1 = findFirst(node, 'h1');
    if (h1 !== null) {
      const text = cleanText(
        measureText(h1, { skipUnlikely: false }, READER_EXTRACT_LIMIT.TitleCharsMax * 2).text,
        READER_EXTRACT_LIMIT.TitleCharsMax,
      );
      return text === '' ? null : text;
    }
    node = node.parentNode;
  }
  return null;
}

/**
 * The page title without its site name: "Guide | Site" and "Guide - Site" lose the last part when
 * it is the site's own name (it appears in the host name: css-tricks.com, web.dev,
 * smashingmagazine.com), repeatedly.
 */
function withoutSiteName(title: string, pageUrl: string | null): string {
  const host = (toBaseUrl(pageUrl)?.hostname ?? '').toLowerCase().replace(NOT_ALPHANUMERIC, '');
  if (host === '') return title;
  let result = title;
  for (let round = 0; round < 4; round++) {
    const parts = result.split(TITLE_SEPARATOR);
    const lastPart = parts.at(-1) ?? '';
    const last = lastPart.toLowerCase().replace(NOT_ALPHANUMERIC, '');
    if (parts.length < 2 || last === '' || !host.includes(last)) break;
    result = result
      .slice(0, result.length - lastPart.length)
      .replace(TITLE_TAIL, '')
      .trim();
  }
  return result;
}

/** A short line that is no sentence: an author, a date, a read time. */
function isByline(block: ReaderBlock): boolean {
  return (
    block.kind === READER_BLOCK_KIND.Paragraph &&
    block.text.length <= BYLINE_CHARS_MAX &&
    !SENTENCE_END.test(block.text)
  );
}

function blockKey(block: ReaderBlock): string {
  const items = (list: ReaderBlock['items']): string =>
    list
      .map((item) => `${item.spans.map((span) => span.text).join('')}${items(item.items)}`)
      .join('|');
  return `${block.kind}:${block.text}:${items(block.items)}:${block.rows.flat().join('|')}`;
}

/**
 * A text, list or table the page repeated word for word (a description printed once per
 * colour or size, a responsive copy) stays once, at its first place; a heading left with nothing
 * under it goes with it.
 */
function dropRepeats(blocks: ReaderBlock[]): ReaderBlock[] {
  const seen = new Set<string>();
  const kept = blocks.filter((block) => {
    if (block.kind === READER_BLOCK_KIND.Heading || block.kind === READER_BLOCK_KIND.Image) {
      return true;
    }
    const key = blockKey(block);
    if (key.length < REPEAT_CHARS_MIN) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return kept.filter((block, index) => {
    if (block.kind !== READER_BLOCK_KIND.Heading) return true;
    const next = kept[index + 1];
    return (
      next !== undefined &&
      !(next.kind === READER_BLOCK_KIND.Heading && (next.level ?? 2) <= (block.level ?? 2))
    );
  });
}

/**
 * Byline lines before the first real paragraph (author, date, read time) and headings with
 * nothing under them at the end go.
 */
function trimEdges(blocks: ReaderBlock[]): void {
  const lead = blocks.findIndex(
    (block) => block.kind === READER_BLOCK_KIND.Paragraph && block.text.length > BYLINE_CHARS_MAX,
  );
  if (lead > 0) {
    const kept = blocks.slice(0, lead).filter((block) => !isByline(block));
    blocks.splice(0, lead, ...kept);
  }
  while (blocks.at(-1)?.kind === READER_BLOCK_KIND.Heading) blocks.pop();
}

/** The containers to try in one pass, best first, without repeats. */
function rootsOf(
  document: HtmlNode,
  body: HtmlNode,
  options: ReaderWalkOptions,
): (HtmlNode | HtmlElement)[] {
  const roots: HtmlNode[] = findRootCandidates(body, options);
  const scored = findContentRoot(body, options);
  if (scored !== null) roots.push(scored);
  for (const tag of FALLBACK_ROOTS) {
    const found = findFirst(document, tag);
    if (found !== null) roots.push(found);
  }
  roots.push(body);
  return roots.filter((root, index) => roots.indexOf(root) === index);
}

/**
 * The readable article of a page as Reader blocks, or `null` when the page has none (fewer than
 * `WordsMin` words or `ParagraphsMin` paragraphs: a shop, an app, a login page). The page is
 * untrusted: only text leaves this function (links and image sources as absolute http(s) URL
 * strings resolved against `pageUrl`, never markup), within the limits of `READER_EXTRACT_LIMIT`.
 * The content root is the article container (`<article>`, `<main>`, known body classes), then the
 * Readability-style scored root, then the body; a first pass skips chrome by class and id, a
 * second reads without that filter. The title is the page's `<h1>` inside the root, else
 * `og:title`, `<title>`, else `fallbackTitle`; a first heading that repeats it is dropped.
 */
export function extractReaderArticle(
  html: string,
  fallbackTitle: string,
  pageUrl: string | null = null,
  now = Date.now(),
): ReaderArticle | null {
  let document: HtmlNode;
  try {
    document = parse(html.slice(0, READER_EXTRACT_LIMIT.HtmlCharsMax));
  } catch {
    return null;
  }
  const body = findFirst(document, 'body') ?? document;
  const head = readArticleHead(document, now);
  const base = toBaseUrl(pageUrl);
  let spent = 0;

  for (const options of PASSES) {
    for (const root of rootsOf(document, body, options)) {
      if (spent >= TOTAL_NODES_MAX) return null;
      const visited = { count: 0 };
      const tag = isElement(root) ? root.tagName : 'body';
      const pageTitle = head.title === null ? null : withoutSiteName(head.title, pageUrl);
      const collector = new BlockCollector({ options, base, visited }, tag, false, pageTitle);
      const blocks = collector.collect(root);
      spent += visited.count;
      const title = collector.title ?? findTitleH1(root) ?? pageTitle ?? fallbackTitle;
      const first = blocks[0];
      if (first?.kind === READER_BLOCK_KIND.Heading && sameText(first.text, title)) blocks.shift();
      blocks.splice(0, blocks.length, ...dropRepeats(blocks));
      trimEdges(blocks);
      // Text blocks: a recipe is a paragraph, an ingredient list and steps.
      const paragraphs = blocks.filter((block) => TEXT_KINDS.has(block.kind)).length;
      const words = wordsOf(blocks);
      if (
        words >= READER_EXTRACT_LIMIT.WordsMin &&
        paragraphs >= READER_EXTRACT_LIMIT.ParagraphsMin
      ) {
        return {
          version: READER_ARTICLE_VERSION,
          title,
          author: head.author,
          publishedAt: head.publishedAt,
          minutes: Math.max(1, Math.round(words / READER_EXTRACT_LIMIT.WordsPerMinute)),
          blocks,
        };
      }
    }
  }
  return null;
}
