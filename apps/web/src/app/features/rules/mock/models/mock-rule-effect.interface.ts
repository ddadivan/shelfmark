/** What a mock rule does to a link being saved: a live folder (or none) and tag names. */
export interface MockRuleEffect {
  folderId: string | null;
  tags: string[];
}
