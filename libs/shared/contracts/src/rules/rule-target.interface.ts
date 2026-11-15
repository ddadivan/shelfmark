/** The part of a rule that matching needs: its domain (normalised) and what it does. */
export interface RuleTarget {
  domain: string;
  folderId: string | null;
  tags: readonly string[];
}
