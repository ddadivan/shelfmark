/** A canned Ask answer of the mock for a demo seed theme. */
export interface MockAskTheme {
  /** The question mentions one of these (lower case). */
  triggers: readonly string[];
  /** A source belongs to the theme when its title, tags or summary mention one of these. */
  sourceWords: readonly string[];
  intro: string;
  /** One sentence per cited source; `{title}` is the source's title. */
  lines: readonly string[];
}
