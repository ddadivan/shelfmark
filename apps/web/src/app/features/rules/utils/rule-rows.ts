import type { FolderColour, FolderResponse, RuleResponse } from '@shelfmark/contracts';
import type { RuleRow } from '../models/rule-row.interface';

/** The Settings rows of the rules: each with the name, icon and shown colour of its live folder. */
export function ruleRows(
  rules: readonly RuleResponse[],
  folders: Readonly<Record<string, FolderResponse | undefined>>,
  shownColour: (colour: FolderColour | string) => FolderColour | string,
): RuleRow[] {
  return rules.map((rule) => {
    const folder =
      rule.folderAvailable && rule.folderId !== null ? folders[rule.folderId] : undefined;
    return {
      rule,
      folder: folder
        ? { name: folder.name, icon: folder.icon, colour: shownColour(folder.colour) }
        : null,
      folderTrashed: !rule.folderAvailable,
    };
  });
}
