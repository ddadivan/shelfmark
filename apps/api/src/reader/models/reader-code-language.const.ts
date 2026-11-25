/**
 * How a page marks the language of a code block: class words (`language-ts`, `lang-js`,
 * `highlight-source-python`) and data attributes.
 */
export const READER_CODE_LANGUAGE = {
  Class:
    /(?:^|[\s_-])(?:language|lang|highlight-source|highlight-text|sourcecode|shiki-lang)[-_:]([a-z][a-z0-9+#]{0,19})(?:[\s_-]|$)/i,
  /** The old syntax-highlighter class `brush: js`. */
  Brush: /(?:^|\s)brush:\s*([a-z][a-z0-9+#]{0,19})/i,
  Attributes: ['data-lang', 'data-language', 'data-code-language'],
  /** Values that say there is no language. */
  None: /^(?:none|text|plain|plaintext|txt|nohighlight|notranslate|undefined|auto)$/i,
  /** A language name as it is kept. */
  Valid: /^[a-z][a-z0-9+#.-]{0,19}$/,
} as const;
