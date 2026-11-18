import { parse } from 'parse5';
import { stripControlChars } from '../../common/validation/has-control-chars';
import { HTML_NODE_NAME } from '../../preview/models/html-node-name.const';
import { EXCERPT_CONTENT_TAGS, EXCERPT_SKIPPED_TAGS } from '../models/excerpt-tag.const';
import { EXCERPT_LIMIT } from '../models/excerpt-limit.const';
import type { HtmlNode } from '../../preview/models/html-node.type';

const BODY_TAG = 'body';

/** Child nodes of an element, of a `<template>`'s content excluded (it is never read). */
function childrenOf(node: HtmlNode): HtmlNode[] {
  return 'childNodes' in node ? node.childNodes : [];
}

function tagOf(node: HtmlNode): string | null {
  return 'tagName' in node ? node.tagName : null;
}

/** The first element named in `names` (document order, iterative so deep markup cannot overflow the stack). */
function findFirst(root: HtmlNode, names: readonly string[]): HtmlNode | null {
  const stack: HtmlNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === undefined) continue;
    const tag = tagOf(node);
    if (tag !== null && EXCERPT_SKIPPED_TAGS.has(tag)) continue;
    if (tag !== null && names.includes(tag)) return node;
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }
  return null;
}

function textOf(root: HtmlNode, maxChars: number): string {
  const parts: string[] = [];
  let length = 0;
  const stack: HtmlNode[] = [root];
  while (stack.length > 0 && length <= maxChars) {
    const node = stack.pop();
    if (node === undefined) continue;
    const tag = tagOf(node);
    if (tag !== null && EXCERPT_SKIPPED_TAGS.has(tag)) continue;
    if (node.nodeName === HTML_NODE_NAME.Text && 'value' in node) {
      parts.push(node.value);
      length += node.value.length;
      continue;
    }
    const children = childrenOf(node);
    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];
      if (child !== undefined) stack.push(child);
    }
  }
  return parts.join(' ');
}

/**
 * The visible text of a page for a link job: scripts, styles, navigation, headers, footers, side
 * bars, SVG and templates are dropped; the page's `main` or `article` is preferred, else the body;
 * control characters become spaces, whitespace collapses, and the text is cut to
 * `EXCERPT_LIMIT.MaxChars`. Returns `null` when nothing readable is left. The result is untrusted
 * text: the prompt builder delimits it and the model never follows it.
 */
export function extractExcerpt(html: string): string | null {
  let document: HtmlNode;
  try {
    document = parse(html);
  } catch {
    return null;
  }
  const root =
    findFirst(document, EXCERPT_CONTENT_TAGS) ?? findFirst(document, [BODY_TAG]) ?? document;
  const text = stripControlChars(textOf(root, EXCERPT_LIMIT.MaxChars))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, EXCERPT_LIMIT.MaxChars)
    .trim();
  return text === '' ? null : text;
}
