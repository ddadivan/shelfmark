/** The visible text under an element and how much of it sits inside links. */
export interface ReaderTextMeasure {
  text: string;
  /** Characters of `text` that belong to `<a>` elements. */
  linkChars: number;
}
