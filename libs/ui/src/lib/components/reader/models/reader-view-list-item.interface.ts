import type { ReaderViewSpan } from './reader-view-span.interface';

/** One item of a `ui-reader` list: its text as spans and the items of a nested list. */
export interface ReaderViewListItem {
  readonly spans: readonly ReaderViewSpan[];
  readonly items: readonly ReaderViewListItem[];
}
