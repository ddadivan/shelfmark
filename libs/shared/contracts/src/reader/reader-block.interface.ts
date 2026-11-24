import type { ReaderBlockKind } from './reader-block-kind.type';

/**
 * One block of a Reader article. Plain text only: `text` for a heading, paragraph, quote or code
 * (the caption for an image), `items` for a list, `imageUrl` (a same-origin image proxy path) for
 * an image.
 */
export interface ReaderBlock {
  kind: ReaderBlockKind;
  text: string;
  /** List items; empty for every other kind. */
  items: string[];
  /** Same-origin path of the image (image blocks only); `null` otherwise. */
  imageUrl: string | null;
}
