/** What a list walk saw: text and link text (a table of contents or a related list is mostly links). */
export interface ReaderListStats {
  chars: number;
  linkChars: number;
  /** Items kept in all levels. */
  items: number;
}
