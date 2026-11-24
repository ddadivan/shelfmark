import type { ReaderViewBlockKind } from './reader-block-kind.type';

/**
 * One block of `ui-reader`: plain text only (`text` for a heading, paragraph, quote or code and the
 * caption of an image; `items` for a list; `imageUrl` for an image). Rendered with elements and
 * interpolation, never as HTML.
 */
export interface ReaderViewBlock {
  readonly kind: ReaderViewBlockKind;
  readonly text: string;
  readonly items: readonly string[];
  readonly imageUrl: string | null;
}
