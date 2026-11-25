import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { HTML_NODE_NAME } from '../../preview/models/html-node-name.const';
import { READER_CHROME_PATTERN } from '../models/reader-chrome-pattern.const';
import { READER_CHROME_ROLE } from '../models/reader-chrome-role.const';
import { READER_CLASS_PATTERN } from '../models/reader-class-pattern.const';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_NOTE_PATTERN } from '../models/reader-note-pattern.const';
import { READER_INLINE_TAGS } from '../models/reader-inline-tags.const';
import { READER_SKIPPED_TAGS } from '../models/reader-skipped-tags.const';
import type { ReaderTextMeasure } from '../models/reader-text-measure.interface';
import type { ReaderWalkOptions } from '../models/reader-walk-options.interface';

const LINK_TAG = 'a';
const HIDDEN_STYLE = /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i;

/** Child nodes of a node (a `<template>`'s content is never read). */
export function childrenOf(node: HtmlNode): HtmlNode[] {
  return 'childNodes' in node ? node.childNodes : [];
}

export function isElement(node: HtmlNode): node is HtmlElement {
  return 'tagName' in node;
}

export function attributeOf(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

/** Text of a text node, else `null`. */
export function textValue(node: HtmlNode): string | null {
  return node.nodeName === HTML_NODE_NAME.Text && 'value' in node ? node.value : null;
}

/** Hidden by markup: `hidden`, `aria-hidden="true"` or an inline `display: none` / `visibility: hidden`. */
function isHidden(element: HtmlElement): boolean {
  if (attributeOf(element, 'hidden') !== undefined) return true;
  if (attributeOf(element, 'aria-hidden') === 'true') return true;
  const style = attributeOf(element, 'style');
  return style !== undefined && HIDDEN_STYLE.test(style);
}

/** Class and id name chrome (comments, share bars, related links) and nothing that names content. */
function isUnlikely(element: HtmlElement): boolean {
  const names = `${attributeOf(element, 'class') ?? ''} ${attributeOf(element, 'id') ?? ''}`;
  return READER_CLASS_PATTERN.Unlikely.test(names) && !READER_CLASS_PATTERN.Likely.test(names);
}

/** Class and id words of an element. */
export function namesOf(element: HtmlElement): string {
  return `${attributeOf(element, 'class') ?? ''} ${attributeOf(element, 'id') ?? ''}`;
}

/** An element that is a callout box (Note, Tip, Warning): by role, or class words, or an `<aside>` that says so. */
export function isNoteBox(element: HtmlElement): boolean {
  const role = attributeOf(element, 'role');
  const names = attributeOf(element, 'class') ?? '';
  if (READER_NOTE_PATTERN.Not.test(names)) return false;
  if (role === 'note') return true;
  if (element.tagName === 'aside') return READER_NOTE_PATTERN.Class.test(names) || role === 'alert';
  if (!['div', 'section', 'blockquote', 'p'].includes(element.tagName)) return false;
  return READER_NOTE_PATTERN.Class.test(names);
}

/** Whether an element is page chrome by its tag, role or markup, in every pass. */
function isChrome(element: HtmlElement): boolean {
  const tag = element.tagName;
  if (tag === 'aside') return !isNoteBox(element);
  if (tag === 'article' && READER_CHROME_PATTERN.Card.test(namesOf(element))) return true;
  if (tag.includes('-') && READER_CHROME_PATTERN.CustomTag.test(tag)) return true;
  const role = attributeOf(element, 'role');
  if (role !== undefined && READER_CHROME_ROLE.has(role)) return true;
  const names = namesOf(element);
  return READER_CHROME_PATTERN.Hidden.test(names) || READER_CHROME_PATTERN.Control.test(names);
}

/** Whether a pass drops this element with everything under it. */
export function isDropped(element: HtmlElement, options: ReaderWalkOptions): boolean {
  return (
    READER_SKIPPED_TAGS.has(element.tagName) ||
    isHidden(element) ||
    isChrome(element) ||
    (options.skipUnlikely && isUnlikely(element))
  );
}

/**
 * The visible text under `root` (dropped elements excluded) and how much of it is link text.
 * Iterative, so deeply nested markup cannot overflow the stack; stops after `maxChars` characters
 * or `READER_EXTRACT_LIMIT.NodesMax` nodes. Inline neighbours are joined without a space; a `<br>`
 * and the edges of a block element are a space.
 */
export function measureText(
  root: HtmlNode,
  options: ReaderWalkOptions,
  maxChars: number,
): ReaderTextMeasure {
  const parts: string[] = [];
  let length = 0;
  let linkChars = 0;
  let visited = 0;
  // `node: null` is the end of a block element: its text is kept apart from what follows.
  const stack: { node: HtmlNode | null; inLink: boolean }[] = [{ node: root, inLink: false }];
  while (stack.length > 0 && length <= maxChars && visited < READER_EXTRACT_LIMIT.NodesMax) {
    const entry = stack.pop();
    if (entry === undefined) continue;
    visited++;
    const { node, inLink } = entry;
    if (node === null) {
      parts.push(' ');
      continue;
    }
    const text = textValue(node);
    if (text !== null) {
      parts.push(text);
      length += text.length;
      if (inLink) linkChars += text.length;
      continue;
    }
    let link = inLink;
    if (isElement(node) && node !== root) {
      if (isDropped(node, options)) continue;
      if (node.tagName === 'br') {
        parts.push(' ');
        continue;
      }
      link = inLink || node.tagName === LINK_TAG;
      if (!READER_INLINE_TAGS.has(node.tagName)) {
        parts.push(' ');
        stack.push({ node: null, inLink });
      }
    }
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push({ node: child, inLink: link });
    }
  }
  return { text: parts.join(''), linkChars };
}

/**
 * The first descendant (breadth first, at most `limit` nodes looked at) that `match` accepts, or
 * `null`. Dropped elements are not entered.
 */
export function findDescendant(
  root: HtmlNode,
  match: (element: HtmlElement) => boolean,
  options: ReaderWalkOptions,
  limit = 400,
): HtmlElement | null {
  const queue: HtmlNode[] = [...childrenOf(root)];
  for (let index = 0; index < queue.length && index < limit; index++) {
    const node = queue[index];
    if (node === undefined || !isElement(node) || isDropped(node, options)) continue;
    if (match(node)) return node;
    queue.push(...childrenOf(node));
  }
  return null;
}
