/**
 * One run of inline text of a `ui-reader` block. Rendered with elements and interpolation, never
 * as HTML: `href` becomes a link that opens in a new tab (`rel="noopener noreferrer"`), `code`,
 * `emphasis` and `strong` become `<code>`, `<em>` and `<strong>`.
 */
export interface ReaderViewSpan {
  readonly text: string;
  /** Absolute http(s) target; the component links only these. */
  readonly href: string | null;
  readonly code: boolean;
  readonly emphasis: boolean;
  readonly strong: boolean;
}
