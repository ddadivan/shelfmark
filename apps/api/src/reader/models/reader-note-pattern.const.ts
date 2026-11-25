/**
 * Callout boxes: class words that make an element a note (`Class`) and the word that names it
 * (`Keyword`). Matched as whole words between separators.
 */
export const READER_NOTE_PATTERN = {
  /** A whole class name: a callout word, alone or after a known prefix (`docs-callout-note`, `markdown-alert-tip`). */
  Class:
    /(?:^|\s)(?:docs-callout|docs-alert|markdown-alert|theme-admonition|(?:(?:docs-callout|docs-alert|docs|theme|theme-admonition|markdown-alert|callout|admonition|alert|is)-)?(?:callouts?|admonitions?|notecard|note|tip|warning|caution|important|danger))(?:\s|$)/i,
  Keyword: /(?:^|[\s_-])(note|tip|warning|caution|important|danger)(?:[\s_-]|$)/i,
  /** A class that is not a callout although it holds the word (`note-list`, a cookie alert). */
  Not: /(?:^|[\s_-])(?:notes?-(?:list|nav|links)|alert-(?:dismiss\w*|bar)|cookie|consent|newsletter|promo|subscribe)(?:[\s_-]|$)/i,
} as const;
