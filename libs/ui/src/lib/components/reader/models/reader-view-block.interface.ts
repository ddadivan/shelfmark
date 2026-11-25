import type { ReaderViewBlockKind } from './reader-block-kind.type';
import type { ReaderViewHeadingLevel } from './reader-view-heading-level.type';
import type { ReaderViewListItem } from './reader-view-list-item.interface';
import type { ReaderViewSpan } from './reader-view-span.interface';

/**
 * One block of `ui-reader`: plain text only, rendered with elements and interpolation, never as
 * HTML. Which fields matter depends on `kind`; the others may be left out:
 *
 * - `heading`: `text` (or `spans`), `level`
 * - `paragraph`, `quote`: `spans` (inline code, links, emphasis); `text` when there are none
 * - `note`: `label` ("Note", "Warning"), `spans` or `text`
 * - `list`: `items` (nested), `ordered`
 * - `code`: `text` with its line breaks, `language`
 * - `table`: `rows` of cell text, `header` (the first row is a header)
 * - `image`: `imageUrl` (an absolute http(s) address that the app's CSP does not let the page
 *   load), `alt`, `text` (the caption). The reader draws a captioned placeholder with an "Open
 *   original" link instead of the picture.
 */
export interface ReaderViewBlock {
  readonly kind: ReaderViewBlockKind;
  readonly text: string;
  readonly spans?: readonly ReaderViewSpan[];
  readonly items?: readonly ReaderViewListItem[];
  readonly ordered?: boolean;
  readonly level?: ReaderViewHeadingLevel | null;
  readonly label?: string | null;
  readonly language?: string | null;
  readonly rows?: readonly (readonly string[])[];
  readonly header?: boolean;
  readonly imageUrl?: string | null;
  readonly alt?: string;
}
