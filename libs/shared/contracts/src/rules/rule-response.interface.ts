/** One domain rule (#398): links from `domain` (and its subdomains) go to a folder and get tags. */
export interface RuleResponse {
  id: string;
  /** Lower-case host without `www.` (IDN in punycode, `xn--…`), matches itself and its subdomains. */
  domain: string;
  /** The target folder, or `null` (the rule only adds tags, or the folder was deleted for good). */
  folderId: string | null;
  /** `false` while the target folder is in Trash: the rule then only adds its tags. */
  folderAvailable: boolean;
  /** Tag names added to a matching link (0 to `RULE_LIMIT.TagsMax`, normalised like link tags). */
  tags: string[];
  createdAt: string;
}
