/**
 * Caps of the Ask tools (ADR 0055 points 2 and 3), in items or characters: search pages, the count
 * groups, folders and tags listed, and the text fields of a link as the model sees it.
 */
export const ASK_TOOL_LIMIT = {
  QueryMax: 200,
  SearchLimitDefault: 10,
  SearchLimitMax: 20,
  SearchOffsetMax: 100,
  WordsScanMax: 120,
  GroupsMax: 20,
  FoldersMax: 200,
  TagsDefault: 50,
  TagsMax: 100,
  FilterNameMax: 300,
  SiteMax: 253,
  TitleMax: 200,
  SiteFieldMax: 120,
  TagsPerLinkMax: 10,
  SummaryListMax: 200,
  SummaryDetailMax: 300,
  NoteDetailMax: 500,
  RefMax: 999,
} as const;
