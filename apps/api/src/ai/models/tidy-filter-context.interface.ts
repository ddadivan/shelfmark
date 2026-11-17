/** What decides which stored suggestions of one link Tidy shows or applies. */
export interface TidyFilterContext {
  /** The user's live folder ids. */
  liveFolderIds: ReadonlySet<string>;
  /** Lower-case names of the user's tags. */
  tagKeys: ReadonlySet<string>;
  /** Lower-case names of the tags on the link. */
  linkTagKeys: ReadonlySet<string>;
  /** True when a rule with a live folder matches the link: the rule decides its folder. */
  ruleDecidesFolder: boolean;
}
