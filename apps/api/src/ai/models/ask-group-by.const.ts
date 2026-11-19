/** How `count_links` can group its count (ADR 0055 point 2); months and sites in UTC and lower case. */
export const ASK_GROUP_BY = {
  Folder: 'folder',
  Tag: 'tag',
  Site: 'site',
  Kind: 'kind',
  Month: 'month',
} as const;
