/**
 * Tag synonyms by the model (ADR 0053 point 2): at most `TagsSentMax` of the user's tags with live
 * links (most used first), each name cut to `NameMax` characters; at most `MaxTokens` of output.
 */
export const TAG_SYNONYMS_LIMIT = {
  TagsSentMax: 300,
  NameMax: 64,
  MaxTokens: 1_024,
} as const;
