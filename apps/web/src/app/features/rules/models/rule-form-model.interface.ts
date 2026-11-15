/** The Signal Form model of the rule dialog. */
export interface RuleFormModel {
  domain: string;
  /** `null` = no folder (the rule only adds tags). */
  folderId: string | null;
  tags: string[];
}
