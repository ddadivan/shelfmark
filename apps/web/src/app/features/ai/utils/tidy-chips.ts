import {
  SUGGESTION_KIND,
  type FolderColour,
  type FolderResponse,
  type LinkSuggestion,
} from '@shelfmark/contracts';
import { TIDY_CHIP_KEYS } from '../models/tidy-chip-keys.const';
import type { TidyChipView } from '../models/tidy-chip-view.interface';

/**
 * The chips of one Tidy row: the folder first (only while the folder is known), then the tags in
 * the server's order. Every chip is selected unless its id is in `deselected`.
 */
export function tidyChips(
  suggestions: readonly LinkSuggestion[],
  folders: Readonly<Record<string, FolderResponse | undefined>>,
  deselected: ReadonlySet<string>,
  shownColour: (colour: FolderColour | string) => FolderColour | string,
): TidyChipView[] {
  const chips: TidyChipView[] = [];
  for (const item of suggestions) {
    const selected = !deselected.has(item.id);
    const keys = TIDY_CHIP_KEYS[item.kind];
    const labelKey = selected ? keys.on : keys.off;
    if (item.kind === SUGGESTION_KIND.Folder) {
      const folder = item.folderId === null ? undefined : folders[item.folderId];
      if (folder) {
        chips.unshift({
          id: item.id,
          kind: item.kind,
          label: folder.name,
          labelKey,
          selected,
          folderColour: shownColour(folder.colour),
          folderIcon: folder.icon,
        });
      }
    } else if (item.tagName !== null) {
      chips.push({ id: item.id, kind: item.kind, label: item.tagName, labelKey, selected });
    }
  }
  return chips;
}
