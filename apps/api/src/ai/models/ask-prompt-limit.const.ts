/** Caps of the fields sent per source to the Ask model (ADR 0052 point 4), in characters. */
export const ASK_PROMPT_LIMIT = {
  TitleMax: 200,
  SiteMax: 120,
  FolderMax: 100,
  TagsMax: 10,
  SummaryMax: 300,
  NoteMax: 500,
} as const;
