import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_ROOT_PATTERN } from '../models/reader-root-pattern.const';
import type { ReaderWalkOptions } from '../models/reader-walk-options.interface';
import { attributeOf, childrenOf, isDropped, isElement, measureText, namesOf } from './html-tree';

const MEASURE_CHARS_MAX = 200_000;
/** A container needs this much text to be an article root at all (about 80 words). */
const ROOT_TEXT_MIN = 500;
/** An inner container that holds this share of the outer one's text is the better root. */
const INNER_SHARE = 0.85;
/** ...or this share when the inner container is named as an article body (`post-content`, `articleBody`). */
const NAMED_INNER_SHARE = 0.5;

function isBodyRoot(element: HtmlElement): boolean {
  return (
    attributeOf(element, 'itemprop')?.toLowerCase() === READER_ROOT_PATTERN.ItemProp ||
    READER_ROOT_PATTERN.Class.test(namesOf(element))
  );
}

function isNamedRoot(element: HtmlElement): boolean {
  return (
    element.tagName === 'article' ||
    element.tagName === 'main' ||
    attributeOf(element, 'role') === 'main' ||
    isBodyRoot(element)
  );
}

function contains(outer: HtmlElement, inner: HtmlElement): boolean {
  let node: HtmlNode | null = inner.parentNode;
  while (node !== null) {
    if (node === outer) return true;
    node = 'parentNode' in node ? node.parentNode : null;
  }
  return false;
}

/**
 * The containers that probably hold the article, best first: every `<article>`, `<main>`,
 * `role="main"`, `itemprop="articleBody"` and known body class with enough text, the most text
 * first, an inner container taking over when it holds nearly all of the outer one's text (so the
 * wrapper's side navigation is not in the root). At most `RootCandidatesMax`; the caller reads each
 * until one yields an article.
 */
export function findRootCandidates(body: HtmlNode, options: ReaderWalkOptions): HtmlElement[] {
  const found: { element: HtmlElement; length: number }[] = [];
  let visited = 0;
  const stack: HtmlNode[] = [...childrenOf(body)].reverse();
  while (stack.length > 0 && visited < READER_EXTRACT_LIMIT.NodesMax) {
    const node = stack.pop();
    if (node === undefined || !isElement(node)) continue;
    visited++;
    if (isDropped(node, { skipUnlikely: false })) continue;
    if (isNamedRoot(node)) {
      const length = measureText(node, options, MEASURE_CHARS_MAX).text.trim().length;
      if (length >= ROOT_TEXT_MIN) found.push({ element: node, length });
    }
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }
  found.sort((a, b) => b.length - a.length);
  const roots: HtmlElement[] = [];
  for (const candidate of found) {
    let best = candidate;
    for (let again = true; again;) {
      const current = best;
      const inner = found
        .filter(
          (other) =>
            other !== current &&
            contains(current.element, other.element) &&
            other.length >=
              current.length * (isBodyRoot(other.element) ? NAMED_INNER_SHARE : INNER_SHARE),
        )
        .sort((a, b) => b.length - a.length)[0];
      again = inner !== undefined;
      if (inner !== undefined) best = inner;
    }
    if (!roots.includes(best.element)) roots.push(best.element);
    if (roots.length >= READER_EXTRACT_LIMIT.RootCandidatesMax) break;
  }
  return roots;
}
