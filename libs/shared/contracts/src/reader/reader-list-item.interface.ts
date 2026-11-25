import type { ReaderSpan } from './reader-span.interface';

/** One item of a Reader list: its own text as spans and the items of a nested list. */
export interface ReaderListItem {
  spans: ReaderSpan[];
  /** Items of a list nested in this one; empty when there is none. */
  items: ReaderListItem[];
}
