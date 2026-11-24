import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_CLASS_PATTERN } from '../models/reader-class-pattern.const';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_HEADING_TAGS } from '../models/reader-heading-tags.const';
import { READER_INLINE_TAGS } from '../models/reader-inline-tags.const';
import type { ReaderWalkOptions } from '../models/reader-walk-options.interface';
import { attributeOf, childrenOf, isDropped, isElement, measureText, textValue } from './html-tree';

/** Elements whose own text is a paragraph for scoring. */
const PARAGRAPH_TAGS: ReadonlySet<string> = new Set(['p', 'pre', 'blockquote']);
/** Elements that may hold a run of text without `<p>` (old or generated markup). */
const TEXT_BOX_TAGS: ReadonlySet<string> = new Set(['div', 'section', 'td']);
const TAG_BONUS: Readonly<Record<string, number>> = {
  article: 10,
  main: 8,
  section: 3,
  div: 5,
  td: 3,
  blockquote: 3,
  pre: 3,
};
const CLASS_WEIGHT = 25;
const CHARS_PER_POINT = 100;
const LENGTH_POINTS_MAX = 3;
/** Raw scores whose link density is measured (the rest cannot win). */
const TOP_CANDIDATES = 5;
/** The parent takes over when this many of its children are good candidates (a split body). */
const SPLIT_CHILDREN_MIN = 2;
const SPLIT_SHARE = 0.3;
const MEASURE_CHARS_MAX = 200_000;

function classWeight(element: HtmlElement): number {
  const names = `${attributeOf(element, 'class') ?? ''} ${attributeOf(element, 'id') ?? ''}`;
  let weight = 0;
  if (READER_CLASS_PATTERN.Likely.test(names)) weight += CLASS_WEIGHT;
  if (READER_CLASS_PATTERN.Unlikely.test(names)) weight -= CLASS_WEIGHT;
  return weight;
}

/** A `div` / `section` / `td` with text and only inline children reads as one paragraph. */
function isTextBox(element: HtmlElement): boolean {
  if (!TEXT_BOX_TAGS.has(element.tagName)) return false;
  let hasText = false;
  for (const child of childrenOf(element)) {
    const text = textValue(child);
    if (text !== null) {
      if (text.trim() !== '') hasText = true;
    } else if (
      isElement(child) &&
      !READER_INLINE_TAGS.has(child.tagName) &&
      child.tagName !== 'br'
    ) {
      return false;
    }
  }
  return hasText;
}

/** Points for one paragraph: one, plus its commas, plus one per 100 characters (at most 3). */
function paragraphPoints(text: string): number {
  const commas = text.split(/[,，、]/).length - 1;
  return 1 + commas + Math.min(Math.floor(text.length / CHARS_PER_POINT), LENGTH_POINTS_MAX);
}

/**
 * The element that holds the article (Readability-style): every paragraph-like element with
 * enough text gives points to its parent (in full) and grandparent (half); each candidate starts
 * from a bonus for its tag and its class / id words; the best few are weighed by how little of
 * their text is link text. When several children of the winner's parent are good candidates too
 * (an article split into sibling boxes), the parent wins. `null` when no paragraph qualifies.
 */
export function findContentRoot(body: HtmlNode, options: ReaderWalkOptions): HtmlElement | null {
  const scores = new Map<HtmlElement, number>();
  const award = (element: HtmlElement | null, points: number): void => {
    if (element === null) return;
    const start = scores.get(element) ?? (TAG_BONUS[element.tagName] ?? 0) + classWeight(element);
    scores.set(element, start + points);
  };
  const parentElement = (node: HtmlNode): HtmlElement | null => {
    const parent = 'parentNode' in node ? node.parentNode : null;
    return parent !== null && isElement(parent) && parent !== body ? parent : null;
  };

  let visited = 0;
  const stack: HtmlNode[] = [...childrenOf(body)].reverse();
  while (stack.length > 0 && visited < READER_EXTRACT_LIMIT.NodesMax) {
    const node = stack.pop();
    if (node === undefined || !isElement(node)) continue;
    visited++;
    if (isDropped(node, options)) continue;
    const paragraph =
      PARAGRAPH_TAGS.has(node.tagName) ||
      (!READER_HEADING_TAGS.has(node.tagName) && isTextBox(node));
    if (paragraph) {
      const text = measureText(node, options, READER_EXTRACT_LIMIT.BlockCharsMax).text.trim();
      if (text.length >= READER_EXTRACT_LIMIT.ScoringTextMin) {
        const points = paragraphPoints(text);
        const parent = parentElement(node);
        award(parent, points);
        award(parent === null ? null : parentElement(parent), points / 2);
      }
      if (node.tagName !== 'div' && node.tagName !== 'section') continue;
    }
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_CANDIDATES)
    .map(([element, score]) => {
      const measure = measureText(element, options, MEASURE_CHARS_MAX);
      const density = measure.text.length === 0 ? 1 : measure.linkChars / measure.text.length;
      return { element, score: score * (1 - density) };
    })
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (best === undefined || best.score <= 0) return null;

  const parent = parentElement(best.element);
  if (parent !== null) {
    const strongSiblings = childrenOf(parent).filter(
      (child) => isElement(child) && (scores.get(child) ?? 0) >= best.score * SPLIT_SHARE,
    ).length;
    if (strongSiblings >= SPLIT_CHILDREN_MIN) return parent;
  }
  return best.element;
}
