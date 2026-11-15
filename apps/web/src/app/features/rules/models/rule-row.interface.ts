import type { FolderColour, RuleResponse } from '@shelfmark/contracts';

/** A rule as the Settings list shows it: the rule plus its live folder's name and look. */
export interface RuleRow {
  rule: RuleResponse;
  /** The live target folder, or `null` (none, or in Trash). */
  folder: { name: string; icon: string; colour: FolderColour | string } | null;
  /** The folder is in Trash: the row says the rule only adds its tags now. */
  folderTrashed: boolean;
}
