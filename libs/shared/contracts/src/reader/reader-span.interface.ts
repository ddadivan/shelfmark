/**
 * One run of inline text of a Reader block, with the inline semantics the page gave it. Plain text
 * only: the web app renders a span with its own elements (`<a>`, `<code>`, `<em>`, `<strong>`),
 * never as HTML.
 */
export interface ReaderSpan {
  text: string;
  /** Absolute `http` / `https` target of a link (opened in a new tab by the client); `null` for no link. */
  href: string | null;
  /** Inline code (`<code>`, `<kbd>`, `<samp>`). */
  code: boolean;
  /** Emphasis (`<em>`, `<i>`). */
  emphasis: boolean;
  /** Strong emphasis (`<strong>`, `<b>`). */
  strong: boolean;
}
