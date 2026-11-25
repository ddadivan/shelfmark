import type { ReaderBlock, ReaderBlockKind } from '@shelfmark/contracts';

/** A Reader block of `kind` with plain text and every other field empty (specs only). */
export function readerBlock(kind: ReaderBlockKind, text: string): ReaderBlock {
  return {
    kind,
    text,
    spans: text === '' ? [] : [{ text, href: null, code: false, emphasis: false, strong: false }],
    items: [],
    ordered: false,
    level: kind === 'heading' ? 2 : null,
    label: null,
    language: null,
    rows: [],
    header: false,
    imageUrl: null,
    alt: '',
  };
}
