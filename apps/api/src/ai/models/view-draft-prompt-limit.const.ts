/**
 * The view-from-a-phrase prompt (#535, ADR 0056): at most `FoldersSentMax` folder paths and
 * `TagsSentMax` tag names of the user, each cut to `NameMax` characters; at most `MaxTokens` of output.
 */
export const VIEW_DRAFT_PROMPT_LIMIT = {
  FoldersSentMax: 100,
  TagsSentMax: 200,
  NameMax: 120,
  MaxTokens: 512,
} as const;
