/** What the matching rule does to a link being saved: a live own folder (or none) and tag names. */
export interface RuleEffect {
  folderId: string | null;
  tags: readonly string[];
}
