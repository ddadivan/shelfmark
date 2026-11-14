import { FOLDER_DEFAULT_ICON, isFolderEmoji, isFolderIconName } from '@shelfmark/contracts';
import type { FolderEmoji, FolderIcon } from '@shelfmark/contracts';
import { FOLDER_STYLE_TAB } from '../models/folder-style-tab.const';
import type { FolderStyleTab } from '../models/folder-style-tab.type';

/** The emoji of the field when it holds exactly one emoji. */
export function chosenEmoji(text: string): FolderEmoji | null {
  const value = text.trim();
  return isFolderEmoji(value) ? value : null;
}

/**
 * What Save applies (#376): the chosen emoji on the Emoji tab, otherwise the icon. An Emoji tab
 * with no valid emoji falls back to the icon's choice.
 */
export function folderStyleSymbol(
  tab: FolderStyleTab,
  icon: string,
  emojiText: string,
): FolderIcon | FolderEmoji {
  if (tab === FOLDER_STYLE_TAB.Emoji) {
    const emoji = chosenEmoji(emojiText);
    if (emoji !== null) {
      return emoji;
    }
  }
  return isFolderIconName(icon) ? icon : FOLDER_DEFAULT_ICON;
}
