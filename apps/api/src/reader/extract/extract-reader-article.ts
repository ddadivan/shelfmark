import { READER_BLOCK_KIND, type ReaderArticle, type ReaderBlock } from '@shelfmark/contracts';
import { parse } from 'parse5';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import type { ReaderWalkOptions } from '../models/reader-walk-options.interface';
import { countWords } from './clean-text';
import { BlockCollector } from './collect-blocks';
import { findContentRoot } from './find-content-root';
import { childrenOf, isElement } from './html-tree';
import { readArticleHead } from './read-article-head';

const FALLBACK_ROOTS: readonly string[] = ['article', 'main', 'body'];
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

function wordsOf(blocks: readonly ReaderBlock[]): number {
  return blocks.reduce(
    (sum, block) =>
      sum + countWords(block.text) + block.items.reduce((n, item) => n + countWords(item), 0),
    0,
  );
}

/** Same text, ignoring case, spacing and punctuation (the page's `<h1>` repeating the title). */
function sameText(a: string, b: string): boolean {
  const key = (value: string): string => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key(a) === key(b);
}

/** One pass: the content root (or `<article>`, `<main>`, `<body>`) turned into blocks. */
function blocksOf(document: HtmlNode, body: HtmlNode, options: ReaderWalkOptions): ReaderBlock[] {
  const root =
    findContentRoot(body, options) ??
    FALLBACK_ROOTS.map((tag) => findFirst(document, tag)).find((node) => node !== null) ??
    body;
  return new BlockCollector(options).collect(root);
}

/**
 * The readable article of a page as Reader blocks, or `null` when the page has none (fewer than
 * `WordsMin` words or `ParagraphsMin` paragraphs: a shop, an app, a login page). The page is
 * untrusted: only text leaves this function (no URL, no markup), within the limits of
 * `READER_EXTRACT_LIMIT`. A first pass skips chrome by class and id; when it finds no article a
 * second pass reads the page without that filter. The title is the page's (`og:title`, then
 * `<title>`), else `fallbackTitle`; a first heading that repeats it is dropped.
 */
export function extractReaderArticle(
  html: string,
  fallbackTitle: string,
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
  const title = head.title ?? fallbackTitle;

  for (const options of PASSES) {
    const blocks = blocksOf(document, body, options);
    const first = blocks[0];
    if (first?.kind === READER_BLOCK_KIND.Heading && sameText(first.text, title)) blocks.shift();
    const paragraphs = blocks.filter((block) => block.kind === READER_BLOCK_KIND.Paragraph).length;
    const words = wordsOf(blocks);
    if (
      words >= READER_EXTRACT_LIMIT.WordsMin &&
      paragraphs >= READER_EXTRACT_LIMIT.ParagraphsMin
    ) {
      return {
        title,
        author: head.author,
        publishedAt: head.publishedAt,
        minutes: Math.max(1, Math.round(words / READER_EXTRACT_LIMIT.WordsPerMinute)),
        blocks,
      };
    }
  }
  return null;
}
