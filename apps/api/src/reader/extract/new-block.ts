import type { ReaderBlock, ReaderBlockKind } from '@shelfmark/contracts';

/** A block of `kind` with every other field empty; `fields` fills the ones the kind uses. */
export function newBlock(kind: ReaderBlockKind, fields: Partial<ReaderBlock> = {}): ReaderBlock {
  return {
    kind,
    text: '',
    spans: [],
    items: [],
    ordered: false,
    level: null,
    label: null,
    language: null,
    rows: [],
    header: false,
    imageUrl: null,
    alt: '',
    ...fields,
  };
}
