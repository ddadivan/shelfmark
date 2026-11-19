/** The naming call of an import grouping: one small JSON object for up to `GroupsMax` clusters. */
export const IMPORT_GROUP_NAMES_LIMIT = {
  MaxTokens: 1_024,
  /** A folder name hint is cut to this many characters in the prompt. */
  HintMax: 100,
} as const;
