/** `POST /api/rules` body. A rule needs a folder or at least one tag. */
export interface CreateRuleRequest {
  /** A domain or an address (`youtube.com`, `https://www.youtube.com/watch?v=1`); stored as `normalizeRuleDomain`. Unique per user. */
  domain: string;
  /** UUID of one of the user's live folders, or `null` / absent for none. */
  folderId?: string | null;
  /** Tag names (missing ones are created when a link is saved), at most `RULE_LIMIT.TagsMax`. */
  tags?: string[];
}
