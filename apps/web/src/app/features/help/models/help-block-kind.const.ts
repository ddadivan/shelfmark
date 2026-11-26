/** The kinds of content block an article section is made of. */
export const HELP_BLOCK = {
  /** A paragraph; `keys[0]` is its text key. */
  Text: 'text',
  /** A numbered list; one key per step. */
  Steps: 'steps',
  /** A sage note (a tip); `keys[0]` is its text key. */
  Tip: 'tip',
  /** A neutral note (a limit to know about); `keys[0]` is its text key. */
  Warn: 'warn',
  /** A screenshot (`public/media/help/<slug>-<theme>.webp`); `keys[0]` is its slug, the alt text is `images.<slug>`. */
  Image: 'image',
  /** The "New rule" screenshot of the Rules article. */
  RuleMock: 'rule-mock',
} as const;
