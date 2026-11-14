import { FOLDER_DEFAULT_ICON } from '@shelfmark/contracts';
import { FOLDER_STYLE_TAB } from '../models/folder-style-tab.const';
import { chosenEmoji, folderStyleSymbol } from './folder-style-symbol';

describe('folderStyleSymbol', () => {
  it('gives the icon on the Icon tab, whatever the emoji field holds', () => {
    expect(folderStyleSymbol(FOLDER_STYLE_TAB.Icon, 'star', '🍕')).toBe('star');
  });

  it('gives the emoji on the Emoji tab', () => {
    expect(folderStyleSymbol(FOLDER_STYLE_TAB.Emoji, 'star', ' 🍕 ')).toBe('🍕');
  });

  it('falls back to the icon on the Emoji tab without a valid emoji', () => {
    expect(folderStyleSymbol(FOLDER_STYLE_TAB.Emoji, 'star', '')).toBe('star');
    expect(folderStyleSymbol(FOLDER_STYLE_TAB.Emoji, 'star', 'pizza')).toBe('star');
  });

  it('uses the default icon for an unknown icon name', () => {
    expect(folderStyleSymbol(FOLDER_STYLE_TAB.Icon, 'nope', '')).toBe(FOLDER_DEFAULT_ICON);
  });

  it('chosenEmoji trims and accepts one emoji only', () => {
    expect(chosenEmoji(' 🍕')).toBe('🍕');
    expect(chosenEmoji('🍕🍕')).toBeNull();
  });
});
