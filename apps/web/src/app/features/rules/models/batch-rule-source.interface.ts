import type { RuleFields } from './rule-fields.interface';

/** How the paste-many list plugs into `BatchRuleService`: its rows and its fields for all links. */
export interface BatchRuleSource {
  /** The links of the list: a key and the address as it will be saved. */
  rows(): readonly { key: string; url: string }[];
  /** "Folder for all" and "Tags for all". */
  batch(): RuleFields;
  /** Whether the folder for all is the user's choice (the rules then keep their folders out). */
  folderLocked(): boolean;
}
