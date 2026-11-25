import {
  READER_BLOCK_KIND,
  type ReaderBlock,
  type ReaderHeadingLevel,
  type ReaderSpan,
} from '@shelfmark/contracts';
import type { HtmlElement } from '../../preview/models/html-element.type';
import type { HtmlNode } from '../../preview/models/html-node.type';
import { READER_CHROME_TEXT } from '../models/reader-chrome-text.const';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { READER_HEADING_TAGS } from '../models/reader-heading-tags.const';
import type { ReaderInlineContext } from '../models/reader-inline-context.interface';
import { READER_INLINE_TAGS } from '../models/reader-inline-tags.const';
import { READER_NOTE_LABEL } from '../models/reader-note-label.const';
import { READER_NOTE_PATTERN } from '../models/reader-note-pattern.const';
import type { ReaderSpanStyle } from '../models/reader-span-style.interface';
import { cleanCode, cleanText } from './clean-text';
import { codeLanguage, codeText } from './code-text';
import { collectListItems } from './collect-list';
import { collectTable } from './collect-table';
import { flattenNote } from './flatten-note';
import {
  attributeOf,
  childrenOf,
  findDescendant,
  isDropped,
  isElement,
  isNoteBox,
  measureText,
  namesOf,
  textValue,
} from './html-tree';
import { imageSource } from './image-source';
import { collectInline, collectInlineChild } from './inline-spans';
import { newBlock } from './new-block';
import { sameText } from './same-text';
import { SpanBuilder } from './span-builder';

const NO_STYLE: ReaderSpanStyle = { href: null, code: false, emphasis: false, strong: false };
const STRONG_STYLE: ReaderSpanStyle = { ...NO_STYLE, strong: true };
const RAW_CHARS_MAX = READER_EXTRACT_LIMIT.CodeCharsMax * 2;
const BLOCK_CONTENT_TAGS: ReadonlySet<string> = new Set(['pre', 'table', 'blockquote']);
const HEADING_LEVEL_MAX = 4;
const BYLINE_CHARS_MAX = 80;
/** Headings of the article before an "end" heading (comments, related) counts as chrome. */
const BLOCKS_BEFORE_END = 3;

/** A short line before the title: an author, a date, a read time. */
function isByline(block: ReaderBlock): boolean {
  return block.kind === READER_BLOCK_KIND.Paragraph && block.text.length <= BYLINE_CHARS_MAX;
}

function textOf(spans: readonly ReaderSpan[]): string {
  return spans.map((span) => span.text).join('');
}

/**
 * Walks a content root in document order and turns it into Reader blocks: headings (h2 to h4),
 * paragraphs with inline spans (also loose text between blocks; two `<br>` in a row end one),
 * nested lists, quotes, callouts, code with its language, tables and figures. Chrome (tables of
 * contents, share and edit links, short link-only paragraphs) is dropped; the walk stops at
 * `BlocksMax` blocks, `TextCharsMax` characters, or an "end" heading (comments, related posts).
 * Text only: a link or image address leaves this class only as an absolute http(s) URL string.
 */
export class BlockCollector {
  readonly blocks: ReaderBlock[] = [];
  /** The text of the first `<h1>` met before any block (the page's own title), else `null`. */
  title: string | null = null;
  private chars = 0;
  private images = 0;
  private ended = false;
  private dropNextList = false;
  private loose = new SpanBuilder();
  private afterBreak = false;

  constructor(
    private readonly ctx: ReaderInlineContext,
    private readonly rootTag: string,
    private readonly nested = false,
    /** The title the page names (`og:title`, `<title>`): a heading that repeats it is chrome. */
    private readonly pageTitle: string | null = null,
  ) {}

  collect(root: HtmlNode): ReaderBlock[] {
    this.walk(root, 0);
    this.flush();
    return this.blocks;
  }

  private get full(): boolean {
    return (
      this.ended ||
      this.blocks.length >= READER_EXTRACT_LIMIT.BlocksMax ||
      this.chars >= READER_EXTRACT_LIMIT.TextCharsMax ||
      this.ctx.visited.count >= READER_EXTRACT_LIMIT.NodesMax
    );
  }

  private walk(node: HtmlNode, depth: number): void {
    for (const child of childrenOf(node)) {
      if (this.full) return;
      const text = textValue(child);
      if (text !== null) {
        this.ctx.visited.count++;
        this.loose.add(text);
        if (text.trim() !== '') this.afterBreak = false;
        continue;
      }
      if (!isElement(child) || isDropped(child, this.ctx.options)) continue;
      this.ctx.visited.count++;
      this.element(child, depth);
    }
  }

  private element(element: HtmlElement, depth: number): void {
    const tag = element.tagName;
    if (tag === 'article' && this.rootTag === 'article') return;
    if (isNoteBox(element) && !this.nested) {
      this.flush();
      this.note(element);
      return;
    }
    if (tag === 'br') {
      if (this.afterBreak) this.flush();
      else {
        this.loose.space();
        this.afterBreak = true;
      }
      return;
    }
    if (tag === 'img' || tag === 'picture') {
      if (this.loose.isEmpty) this.image(element, null);
      return;
    }
    if (tag === 'a') {
      this.anchor(element, depth);
      return;
    }
    if (READER_INLINE_TAGS.has(tag)) {
      collectInlineChild(element, NO_STYLE, this.loose, this.ctx);
      this.afterBreak = false;
      return;
    }
    this.flush();
    if (READER_HEADING_TAGS.has(tag)) {
      this.heading(element);
    } else if (tag === 'p' || tag === 'summary') {
      this.paragraph(element, NO_STYLE);
    } else if (tag === 'dt') {
      this.paragraph(element, STRONG_STYLE);
    } else if (tag === 'blockquote') {
      this.quote(element);
    } else if (tag === 'pre') {
      this.code(element);
    } else if (tag === 'ul' || tag === 'ol') {
      this.list(element, tag === 'ol');
    } else if (tag === 'table') {
      this.table(element, depth);
    } else if (tag === 'figure') {
      this.figure(element, depth);
    } else if (tag === 'hr') {
      return;
    } else if (depth < READER_EXTRACT_LIMIT.DepthMax) {
      this.walk(element, depth + 1);
      this.flush();
    }
  }

  /** A link at block level: a card of blocks is walked, a picture link is the picture, else inline. */
  private anchor(element: HtmlElement, depth: number): void {
    const hasBlock = findDescendant(
      element,
      (child) => !READER_INLINE_TAGS.has(child.tagName) && child.tagName !== 'br',
      this.ctx.options,
      60,
    );
    if (hasBlock === null) {
      collectInlineChild(element, NO_STYLE, this.loose, this.ctx);
      this.afterBreak = false;
      return;
    }
    const picture = findDescendant(
      element,
      (child) => child.tagName === 'img' || child.tagName === 'picture',
      this.ctx.options,
      60,
    );
    const plain = measureText(element, this.ctx.options, 200).text.trim() === '';
    this.flush();
    if (picture !== null && plain) {
      this.image(picture, null);
    } else if (depth < READER_EXTRACT_LIMIT.DepthMax) {
      this.walk(element, depth + 1);
      this.flush();
    }
  }

  private spansOf(element: HtmlElement, style: ReaderSpanStyle): ReaderSpan[] {
    const builder = new SpanBuilder();
    collectInline(element, style, builder, this.ctx);
    return builder.finish(READER_EXTRACT_LIMIT.BlockCharsMax, READER_EXTRACT_LIMIT.SpansMax);
  }

  private heading(element: HtmlElement): void {
    const spans = this.spansOf(element, NO_STYLE);
    const text = textOf(spans);
    if (text === '') return;
    const number = Number(element.tagName.slice(1));
    if (number === 1 && this.title === null && this.blocks.every(isByline)) {
      // The page's own title; what came before it (author, date) was the byline, not text.
      this.title = cleanText(text, READER_EXTRACT_LIMIT.TitleCharsMax);
      this.blocks.length = 0;
      this.chars = 0;
      return;
    }
    const known = this.title ?? this.pageTitle;
    if (known !== null && sameText(text, known)) {
      // The title again: at the start it is the heading of the article, later a listing card.
      if (this.blocks.length >= BLOCKS_BEFORE_END) this.ended = true;
      return;
    }
    const key = text.replace(/[\s:]+$/, '');
    if (READER_CHROME_TEXT.Skip.test(key)) {
      this.dropNextList = true;
      return;
    }
    if (READER_CHROME_TEXT.End.test(key) && this.blocks.length >= BLOCKS_BEFORE_END) {
      this.ended = true;
      return;
    }
    const level = Math.min(Math.max(number, 2), HEADING_LEVEL_MAX) as ReaderHeadingLevel;
    this.push(newBlock(READER_BLOCK_KIND.Heading, { text, spans, level }));
  }

  private paragraph(element: HtmlElement, style: ReaderSpanStyle): void {
    const builder = new SpanBuilder();
    collectInline(element, style, builder, this.ctx);
    const spans = builder.finish(READER_EXTRACT_LIMIT.BlockCharsMax, READER_EXTRACT_LIMIT.SpansMax);
    this.pushText(READER_BLOCK_KIND.Paragraph, spans, builder);
  }

  private quote(element: HtmlElement): void {
    const builder = new SpanBuilder();
    collectInline(element, NO_STYLE, builder, this.ctx);
    const spans = builder.finish(READER_EXTRACT_LIMIT.BlockCharsMax, READER_EXTRACT_LIMIT.SpansMax);
    const text = textOf(spans);
    if (text !== '') this.push(newBlock(READER_BLOCK_KIND.Quote, { text, spans }));
  }

  /** A paragraph from spans; short link-only lines and page chrome text are dropped. */
  private pushText(
    kind: typeof READER_BLOCK_KIND.Paragraph,
    spans: ReaderSpan[],
    builder: SpanBuilder,
  ): void {
    const text = textOf(spans);
    if (text === '') return;
    const key = text.replace(/[\s:.!?]+$/, '');
    if (READER_CHROME_TEXT.Skip.test(key)) return;
    if (READER_CHROME_TEXT.End.test(key) && this.blocks.length >= BLOCKS_BEFORE_END) {
      this.ended = true;
      return;
    }
    const short = text.length < READER_EXTRACT_LIMIT.BlockCharsMax / 20;
    if (
      short &&
      builder.linkChars / Math.max(builder.chars, 1) > READER_EXTRACT_LIMIT.LinkDensityMax
    ) {
      return;
    }
    this.push(newBlock(kind, { text, spans }));
  }

  private code(element: HtmlElement): void {
    const text = cleanCode(
      codeText(element, this.ctx, RAW_CHARS_MAX),
      READER_EXTRACT_LIMIT.CodeCharsMax,
    );
    if (text === '') return;
    this.push(newBlock(READER_BLOCK_KIND.Code, { text, language: codeLanguage(element) }));
  }

  private list(element: HtmlElement, ordered: boolean): void {
    const stats = { chars: 0, linkChars: 0, items: 0 };
    const items = collectListItems(element, this.ctx, stats);
    const dropped = this.dropNextList;
    this.dropNextList = false;
    if (dropped || items.length === 0) return;
    // A list of links (related posts, a table of contents) is chrome.
    if (stats.chars > 0 && stats.linkChars / stats.chars > READER_EXTRACT_LIMIT.LinkDensityMax) {
      return;
    }
    this.push(newBlock(READER_BLOCK_KIND.List, { ordered, items }));
  }

  private table(element: HtmlElement, depth: number): void {
    const data = collectTable(element, this.ctx);
    if (data !== null) {
      this.push(newBlock(READER_BLOCK_KIND.Table, { rows: data.rows, header: data.header }));
    } else if (depth < READER_EXTRACT_LIMIT.DepthMax) {
      this.walk(element, depth + 1);
      this.flush();
    }
  }

  private figure(element: HtmlElement, depth: number): void {
    const hasContent = findDescendant(
      element,
      (child) => BLOCK_CONTENT_TAGS.has(child.tagName),
      this.ctx.options,
      200,
    );
    if (hasContent !== null) {
      if (depth < READER_EXTRACT_LIMIT.DepthMax) this.walk(element, depth + 1);
      this.flush();
      return;
    }
    const picture = findDescendant(
      element,
      (child) => child.tagName === 'img' || child.tagName === 'picture',
      this.ctx.options,
      200,
    );
    const captionElement = findDescendant(
      element,
      (child) => child.tagName === 'figcaption',
      this.ctx.options,
      200,
    );
    const caption =
      captionElement === null
        ? ''
        : cleanText(
            measureText(captionElement, this.ctx.options, RAW_CHARS_MAX).text,
            READER_EXTRACT_LIMIT.BlockCharsMax,
          );
    if (picture !== null) this.image(picture, caption);
  }

  private image(element: HtmlElement, caption: string | null): void {
    if (this.images >= READER_EXTRACT_LIMIT.ImagesMax) return;
    const source = imageSource(element, this.ctx);
    if (source === null) return;
    this.images++;
    this.push(
      newBlock(READER_BLOCK_KIND.Image, {
        imageUrl: source.url,
        alt: source.alt,
        text: caption ?? '',
      }),
    );
  }

  /** A callout: its blocks are read on their own and flattened to a label and spans. */
  private note(element: HtmlElement): void {
    const inner = new BlockCollector(this.ctx, this.rootTag, true, this.pageTitle);
    const blocks = inner.collect(element);
    const keyword = READER_NOTE_PATTERN.Keyword.exec(namesOf(element))?.[1]?.toLowerCase();
    const fallback =
      READER_NOTE_LABEL[keyword ?? attributeOf(element, 'data-callout') ?? ''] ?? 'Note';
    const flat = flattenNote(blocks, fallback);
    if (flat === null) return;
    const label = cleanText(flat.label, READER_EXTRACT_LIMIT.LabelCharsMax);
    this.push(
      newBlock(READER_BLOCK_KIND.Note, {
        label: label === '' ? fallback : label,
        text: textOf(flat.spans),
        spans: flat.spans,
      }),
    );
  }

  /** Loose text gathered between blocks becomes a paragraph. */
  private flush(): void {
    this.afterBreak = false;
    if (this.loose.isEmpty) {
      this.loose = new SpanBuilder();
      return;
    }
    const builder = this.loose;
    this.loose = new SpanBuilder();
    const spans = builder.finish(READER_EXTRACT_LIMIT.BlockCharsMax, READER_EXTRACT_LIMIT.SpansMax);
    this.pushText(READER_BLOCK_KIND.Paragraph, spans, builder);
  }

  private push(block: ReaderBlock): void {
    if (this.full) return;
    this.dropNextList = false;
    this.blocks.push(block);
    const itemChars = (items: ReaderBlock['items']): number =>
      items.reduce((sum, item) => sum + textOf(item.spans).length + itemChars(item.items), 0);
    this.chars +=
      block.text.length +
      itemChars(block.items) +
      block.rows.reduce((sum, row) => sum + row.join('').length, 0);
  }
}
