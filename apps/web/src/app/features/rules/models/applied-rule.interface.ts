/** What a rule put into a save form, so it can be taken out again (the chip's remove, another URL). */
export interface AppliedRule {
  ruleId: string;
  domain: string;
  /** The folder the rule set, or `null` when it left the folder alone. */
  folderId: string | null;
  /** The folder before the rule set its own. */
  previousFolderId: string | null;
  /** The tags the rule added (those the form did not have). */
  tags: string[];
}
