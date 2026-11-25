import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_INLINE_STYLE_TAGS } from '../models/reader-inline-style-tags.const';
import type { ReaderInlineContext } from '../models/reader-inline-context.interface';
import { READER_INLINE_TAGS } from '../models/reader-inline-tags.const';
import type { ReaderSpanStyle } from '../models/reader-span-style.interface';
import { codeText } from './code-text';
import { attributeOf, childrenOf, isDropped, isElement, namesOf, textValue } from './html-tree';
import { toHttpUrl } from './resolve-url';
import { SpanBuilder } from './span-builder';

const NO_STYLE: ReaderSpanStyle = { href: null, code: false, emphasis: false, strong: false };
const ANCHOR_CLASS = /anchor|permalink|heading-link|header-link/i;
const ANCHOR_SYMBOLS = /^[#¶§🔗]*$/u;
const CODE_RAW_MAX = READER_EXTRACT_LIMIT.CodeCharsMax * 2;

function styleFor(element: HtmlElement, style: ReaderSpanStyle, ctx: ReaderInlineContext) {
  const tag = element.tagName;
  if (tag === 'a') {
    if (style.href !== null) return style;
    const href = toHttpUrl(attributeOf(element, 'href'), ctx.base);
    return href === null ? style : { ...style, href };
  }
  const change = READER_INLINE_STYLE_TAGS[tag];
  return change === undefined ? style : { ...style, [change]: true };
}

function collectAnchor(
  anchor: HtmlElement,
  style: ReaderSpanStyle,
  builder: SpanBuilder,
  ctx: ReaderInlineContext,
  depth: number,
): void {
  if (!ANCHOR_CLASS.test(namesOf(anchor))) {
    collectInline(anchor, styleFor(anchor, style, ctx), builder, ctx, depth + 1);
    return;
  }
  const probe = new SpanBuilder();
  collectInline(anchor, NO_STYLE, probe, ctx, depth + 1);
  const spans = probe.finish(40, 4);
  if (!ANCHOR_SYMBOLS.test(spans.map((span) => span.text).join(''))) {
    collectInline(anchor, styleFor(anchor, style, ctx), builder, ctx, depth + 1);
  }
}

/**
 * Adds one node (a text node or an element with what is under it) to `builder` as typed spans:
 * text, links (only absolute http(s) targets survive), inline code, emphasis and strong. Hidden
 * and chrome elements, images and nested lists are skipped; a block element is a space on both
 * sides. Recursive, but bounded by `DepthMax` and the shared node budget.
 */
export function collectInlineChild(
  child: HtmlNode,
  style: ReaderSpanStyle,
  builder: SpanBuilder,
  ctx: ReaderInlineContext,
  depth = 0,
): void {
  if (depth > READER_EXTRACT_LIMIT.DepthMax || ctx.visited.count >= READER_EXTRACT_LIMIT.NodesMax) {
    return;
  }
  ctx.visited.count++;
  const text = textValue(child);
  if (text !== null) {
    builder.add(text, style);
    return;
  }
  if (!isElement(child) || isDropped(child, ctx.options)) return;
  const tag = child.tagName;
  if (tag === 'br') {
    builder.space();
  } else if (tag === 'ul' || tag === 'ol' || tag === 'img') {
    return;
  } else if (tag === 'pre') {
    builder.add(codeText(child, ctx, CODE_RAW_MAX), { ...style, code: true });
  } else if (tag === 'a') {
    const chars = builder.chars;
    const linked = builder.linkChars;
    collectAnchor(child, style, builder, ctx, depth);
    // The text of a link counts as link text even when its address is dropped (relative, `#`).
    builder.linkChars = linked + Math.max(builder.chars - chars, builder.linkChars - linked);
  } else if (READER_INLINE_TAGS.has(tag)) {
    collectInline(child, styleFor(child, style, ctx), builder, ctx, depth + 1);
  } else {
    builder.space();
    collectInline(child, style, builder, ctx, depth + 1);
    builder.space();
  }
}

/** Adds the inline content of `parent` (all its children) to `builder`; see `collectInlineChild`. */
export function collectInline(
  parent: HtmlNode,
  style: ReaderSpanStyle,
  builder: SpanBuilder,
  ctx: ReaderInlineContext,
  depth = 0,
): void {
  for (const child of childrenOf(parent)) collectInlineChild(child, style, builder, ctx, depth);
}
