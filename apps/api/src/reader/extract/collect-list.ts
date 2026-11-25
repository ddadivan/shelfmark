import type { ReaderListItem } from '@shelfmark/contracts';
import type { HtmlElement } from '../../preview/models/html-element.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import type { ReaderInlineContext } from '../models/reader-inline-context.interface';
import type { ReaderListStats } from '../models/reader-list-stats.interface';
import type { ReaderSpanStyle } from '../models/reader-span-style.interface';
import { attributeOf, childrenOf, isDropped, isElement, textValue } from './html-tree';
import { collectInlineChild } from './inline-spans';
import { isSamePageFragment } from './resolve-url';
import { SpanBuilder } from './span-builder';

const NO_STYLE: ReaderSpanStyle = { href: null, code: false, emphasis: false, strong: false };

/** The item is one `<a href="#...">` and nothing else (a table of contents entry). */
function isFragmentLink(item: HtmlElement, base: URL | null): boolean {
  const elements = childrenOf(item).filter(
    (child) => isElement(child) || (textValue(child) ?? '').trim() !== '',
  );
  return (
    elements.length > 0 &&
    elements.every(
      (child) =>
        isElement(child) &&
        child.tagName === 'a' &&
        isSamePageFragment(attributeOf(child, 'href'), base),
    )
  );
}

/**
 * The items of a `<ul>` / `<ol>` as spans with nested lists (down to `ListDepthMax`). Items that
 * are only a same-page link count as link text, so a table of contents reads as chrome in the
 * stats. At most `ListItemsMax` items per level.
 */
export function collectListItems(
  list: HtmlElement,
  ctx: ReaderInlineContext,
  stats: ReaderListStats,
  depth = 1,
): ReaderListItem[] {
  const items: ReaderListItem[] = [];
  for (const child of childrenOf(list)) {
    if (items.length >= READER_EXTRACT_LIMIT.ListItemsMax) break;
    if (!isElement(child) || child.tagName !== 'li' || isDropped(child, ctx.options)) continue;
    const builder = new SpanBuilder();
    const nested: ReaderListItem[] = [];
    for (const part of childrenOf(child)) {
      if (
        isElement(part) &&
        (part.tagName === 'ul' || part.tagName === 'ol') &&
        !isDropped(part, ctx.options)
      ) {
        if (depth < READER_EXTRACT_LIMIT.ListDepthMax) {
          nested.push(...collectListItems(part, ctx, stats, depth + 1));
        }
      } else {
        collectInlineChild(part, NO_STYLE, builder, ctx);
      }
    }
    const spans = builder.finish(READER_EXTRACT_LIMIT.BlockCharsMax, READER_EXTRACT_LIMIT.SpansMax);
    if (spans.length === 0 && nested.length === 0) continue;
    stats.items++;
    stats.chars += builder.chars;
    stats.linkChars += isFragmentLink(child, ctx.base) ? builder.chars : builder.linkChars;
    items.push({ spans, items: nested });
  }
  return items;
}
