/** A canned mock answer for a demo seed theme; `{title}` is replaced by a cited source's title. */
export interface MockAskTheme {
  /** Question words that pick the theme. */
  readonly triggers: readonly string[];
  /** Words a source's title, tags or summary must have to be cited. */
  readonly sourceWords: readonly string[];
  readonly intro: string;
  readonly lines: readonly string[];
}
