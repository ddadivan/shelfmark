import { READER_BLOCK_KIND, type ReaderBlock, type ReaderBlockKind } from '@shelfmark/contracts';
import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_HEADING_TAGS } from '../models/reader-heading-tags.const';
import { READER_INLINE_TAGS } from '../models/reader-inline-tags.const';
import type { ReaderWalkOptions } from '../models/reader-walk-options.interface';
import { cleanCode, cleanText } from './clean-text';
import { childrenOf, isDropped, isElement, measureText, textValue } from './html-tree';

const LIST_TAGS: ReadonlySet<string> = new Set(['ul', 'ol']);
const LIST_ITEM_TAG = 'li';
/** Text gathered for one block before it is cleaned (a little over the block limit). */
const RAW_CHARS_MAX = READER_EXTRACT_LIMIT.CodeCharsMax * 2;

/**
 * Walks the content root in document order and turns it into Reader blocks: headings, paragraphs
 * (also loose text between blocks; two `<br>` in a row end one), lists (direct items), quotes and code. Short chrome made mostly
 * of link text is dropped; the walk stops at `BlocksMax` blocks or `TextCharsMax` characters and
 * does not follow markup deeper than `DepthMax`. Text only: no URL or markup leaves this class.
 */
export class BlockCollector {
  readonly blocks: ReaderBlock[] = [];
  private chars = 0;
  private visited = 0;
  private loose: string[] = [];
  /** The last thing in `loose` was a `<br>` (whitespace aside): a second one ends the paragraph. */
  private afterBreak = false;

  constructor(private readonly options: ReaderWalkOptions) {}

  collect(root: HtmlNode): ReaderBlock[] {
    this.walk(root, 0);
    this.flush();
    return this.blocks;
  }

  private get full(): boolean {
    return (
      this.blocks.length >= READER_EXTRACT_LIMIT.BlocksMax ||
      this.chars >= READER_EXTRACT_LIMIT.TextCharsMax ||
      this.visited >= READER_EXTRACT_LIMIT.NodesMax
    );
  }

  private walk(node: HtmlNode, depth: number): void {
    for (const child of childrenOf(node)) {
      if (this.full) return;
      this.visited++;
      const text = textValue(child);
      if (text !== null) {
        this.loose.push(text);
        if (text.trim() !== '') this.afterBreak = false;
        continue;
      }
      if (!isElement(child) || isDropped(child, this.options)) continue;
      this.element(child, depth);
    }
  }

  private element(element: HtmlElement, depth: number): void {
    const tag = element.tagName;
    if (READER_INLINE_TAGS.has(tag)) {
      this.loose.push(measureText(element, this.options, RAW_CHARS_MAX).text);
      this.afterBreak = false;
      return;
    }
    if (tag === 'br') {
      if (this.afterBreak) {
        this.flush();
      } else {
        this.loose.push(' ');
        this.afterBreak = true;
      }
      return;
    }
    this.flush();
    if (READER_HEADING_TAGS.has(tag)) {
      this.textBlock(READER_BLOCK_KIND.Heading, element, false);
    } else if (tag === 'p') {
      this.textBlock(READER_BLOCK_KIND.Paragraph, element, true);
    } else if (tag === 'blockquote') {
      this.textBlock(READER_BLOCK_KIND.Quote, element, false);
    } else if (tag === 'pre') {
      const code = cleanCode(
        measureText(element, this.options, RAW_CHARS_MAX).text,
        READER_EXTRACT_LIMIT.CodeCharsMax,
      );
      this.push(READER_BLOCK_KIND.Code, code, []);
    } else if (LIST_TAGS.has(tag)) {
      this.list(element);
    } else if (depth < READER_EXTRACT_LIMIT.DepthMax) {
      this.walk(element, depth + 1);
      this.flush();
    }
  }

  private textBlock(kind: ReaderBlockKind, element: HtmlElement, dropLinkChrome: boolean): void {
    const measure = measureText(element, this.options, RAW_CHARS_MAX);
    const text = cleanText(measure.text, READER_EXTRACT_LIMIT.BlockCharsMax);
    if (dropLinkChrome && isLinkChrome(text, measure.linkChars)) return;
    this.push(kind, text, []);
  }

  private list(element: HtmlElement): void {
    const items: string[] = [];
    let chars = 0;
    let linkChars = 0;
    for (const child of childrenOf(element)) {
      if (items.length >= READER_EXTRACT_LIMIT.ListItemsMax) break;
      if (!isElement(child) || child.tagName !== LIST_ITEM_TAG || isDropped(child, this.options)) {
        continue;
      }
      const measure = measureText(child, this.options, RAW_CHARS_MAX);
      const item = cleanText(measure.text, READER_EXTRACT_LIMIT.BlockCharsMax);
      if (item === '') continue;
      items.push(item);
      chars += item.length;
      linkChars += measure.linkChars;
    }
    // A list of links (related posts, a table of contents) is chrome.
    if (
      items.length === 0 ||
      (chars > 0 && linkChars / chars > READER_EXTRACT_LIMIT.LinkDensityMax)
    ) {
      return;
    }
    this.push(READER_BLOCK_KIND.List, '', items);
  }

  /** Loose text gathered between blocks becomes a paragraph. */
  private flush(): void {
    this.afterBreak = false;
    if (this.loose.length === 0) return;
    const text = cleanText(this.loose.join(''), READER_EXTRACT_LIMIT.BlockCharsMax);
    this.loose = [];
    this.push(READER_BLOCK_KIND.Paragraph, text, []);
  }

  private push(kind: ReaderBlockKind, text: string, items: string[]): void {
    if (this.full || (text === '' && items.length === 0)) return;
    this.blocks.push({ kind, text, items, imageUrl: null });
    this.chars += text.length + items.reduce((sum, item) => sum + item.length, 0);
  }
}

/** A short paragraph that is mostly link text ("Read more", "Share on …"). */
function isLinkChrome(text: string, linkChars: number): boolean {
  return (
    text.length > 0 &&
    text.length < READER_EXTRACT_LIMIT.BlockCharsMax / 20 &&
    linkChars / text.length > READER_EXTRACT_LIMIT.LinkDensityMax
  );
}
