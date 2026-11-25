import { READER_BLOCK_KIND, type ReaderBlock, type ReaderSpan } from '@shelfmark/contracts';
import { READER_EXTRACT_LIMIT } from '../models/reader-extract-limit.const';
import { SpanBuilder } from './span-builder';

const LABEL_END = /[:.!\s]+$/;
const STYLE = { href: null, code: false, emphasis: false, strong: false };

function plain(span: ReaderSpan): boolean {
  return span.href === null && !span.code;
}

function cleanLabel(value: string): string {
  const label = value.replace(LABEL_END, '').trim();
  // "IMPORTANT" is read as "Important".
  return label === label.toUpperCase() && label.length > 1
    ? `${label.charAt(0)}${label.slice(1).toLowerCase()}`
    : label;
}

/**
 * A callout's own label from its first block: a heading, a paragraph that is all strong text
 * ("Note"), or a paragraph that starts with a short strong run ending in a colon or period
 * ("Warning: ..."). Returns the label and the blocks that remain.
 */
function splitLabel(
  blocks: ReaderBlock[],
  fallback: string,
): { label: string; rest: ReaderBlock[] } {
  const first = blocks[0];
  const max = READER_EXTRACT_LIMIT.LabelCharsMax;
  if (first === undefined) return { label: fallback, rest: blocks };
  if (first.kind === READER_BLOCK_KIND.Heading && first.text.length <= max && blocks.length > 1) {
    return { label: cleanLabel(first.text) || fallback, rest: blocks.slice(1) };
  }
  if (first.kind === READER_BLOCK_KIND.Paragraph) {
    const lead = first.spans[0];
    if (blocks.length > 1 && cleanLabel(first.text).toLowerCase() === fallback.toLowerCase()) {
      // The callout's title repeats the label its class names ("Note").
      return { label: fallback, rest: blocks.slice(1) };
    }
    if (first.spans.every((span) => span.strong && plain(span)) && first.text.length <= max) {
      if (blocks.length > 1) {
        return { label: cleanLabel(first.text) || fallback, rest: blocks.slice(1) };
      }
    } else if (
      lead !== undefined &&
      lead.strong &&
      plain(lead) &&
      lead.text.length <= max &&
      /[:.]\s*$/.test(lead.text)
    ) {
      const spans = first.spans.slice(1);
      const text = spans.map((span) => span.text).join('');
      return {
        label: cleanLabel(lead.text) || fallback,
        rest: [{ ...first, spans, text }, ...blocks.slice(1)],
      };
    }
  }
  return { label: fallback, rest: blocks };
}

/**
 * A callout read as blocks, flattened to one run of spans with a label: paragraphs, quotes,
 * headings and list items one after the other, code as code spans; images and tables are left
 * out. `null` when nothing is left.
 */
export function flattenNote(
  blocks: ReaderBlock[],
  fallbackLabel: string,
): { label: string; spans: ReaderSpan[] } | null {
  const { label, rest } = splitLabel(blocks, fallbackLabel);
  const builder = new SpanBuilder();
  const addItems = (items: ReaderBlock['items']): void => {
    for (const item of items) {
      builder.space();
      for (const span of item.spans) builder.add(span.text, span);
      addItems(item.items);
    }
  };
  for (const block of rest) {
    builder.space();
    if (block.kind === READER_BLOCK_KIND.Code) {
      builder.add(block.text, { ...STYLE, code: true });
    } else if (block.kind === READER_BLOCK_KIND.List) {
      addItems(block.items);
    } else {
      for (const span of block.spans) builder.add(span.text, span);
    }
  }
  const spans = builder.finish(READER_EXTRACT_LIMIT.NoteCharsMax, READER_EXTRACT_LIMIT.SpansMax);
  return spans.length === 0 ? null : { label, spans };
}
