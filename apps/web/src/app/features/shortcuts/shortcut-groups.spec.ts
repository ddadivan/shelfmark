import { TOAST_SHORTCUT } from '@shelfmark/ui';
import { LINK_SELECT_SHORTCUT } from '../links/selection/models/link-select-shortcut.const';
import { SEARCH_SHORTCUT_KEY } from '../search/models/search-shortcut-key.const';
import { SHORTCUT_GROUPS } from './models/shortcut-groups.const';
import { SHORTCUT_KEY } from './models/shortcut-key.const';
import type { ShortcutKey } from './models/shortcut-key.type';
import { SHORTCUTS_HELP_KEY } from './models/shortcuts-help-key.const';

/** The list key of a letter the handlers match (`'k'`, or the `code` `'KeyT'`). */
function letterKey(letter: string): ShortcutKey {
  const name = letter.replace(/^Key/u, '').toLowerCase();
  const key = Object.values(SHORTCUT_KEY).find((value) => value === name);
  if (!key) {
    throw new Error(`SHORTCUT_KEY has no "${name}"`);
  }
  return key;
}

/** The list key of the symbol that opens the list. */
function symbolKey(symbol: string): ShortcutKey {
  if (symbol !== '?') {
    throw new Error(`SHORTCUT_KEY has no "${symbol}"`);
  }
  return SHORTCUT_KEY.Question;
}

/**
 * Every key handler of the app, the keys it listens to and the row that lists it. Letters come
 * from the constants the handlers use, so changing a handler's key breaks this spec until the list
 * follows. A new handler adds a line here and a row to `SHORTCUT_GROUPS`.
 */
const BOUND: readonly { labelKey: string; keys: readonly ShortcutKey[] }[] = [
  // SearchDialogService.handleShortcut
  {
    labelKey: 'shortcuts.items.search',
    keys: [SHORTCUT_KEY.Command, letterKey(SEARCH_SHORTCUT_KEY)],
  },
  // ShortcutsDialogService.handleShortcut
  { labelKey: 'shortcuts.items.list', keys: [symbolKey(SHORTCUTS_HELP_KEY)] },
  // ui-dialog / ui-sheet (CDK), ui-menu, ToastService, link drag
  { labelKey: 'shortcuts.items.close', keys: [SHORTCUT_KEY.Escape] },
  // ToastService: Ctrl/Cmd+Z runs Undo while an Undo toast shows
  { labelKey: 'shortcuts.items.undo', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.Z] },
  // ToastService.handleShortcut
  {
    labelKey: 'shortcuts.items.toastAction',
    keys: [SHORTCUT_KEY.Alt, SHORTCUT_KEY.Shift, letterKey(TOAST_SHORTCUT.code)],
  },
  // AddLinkDialogComponent.onKeydown
  { labelKey: 'shortcuts.items.save', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.Enter] },
  // LibraryPage: document paste
  { labelKey: 'shortcuts.items.paste', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.V] },
  // SearchDialogComponent: the results list
  { labelKey: 'shortcuts.items.results', keys: [SHORTCUT_KEY.Up, SHORTCUT_KEY.Down] },
  { labelKey: 'shortcuts.items.openResult', keys: [SHORTCUT_KEY.Enter] },
  {
    labelKey: 'shortcuts.items.openBackground',
    keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.Enter],
  },
  // linkKeyIntent (cards and rows) and LibraryPage.selectionKey
  { labelKey: 'shortcuts.items.select', keys: [SHORTCUT_KEY.Space] },
  { labelKey: 'shortcuts.items.selectRange', keys: [SHORTCUT_KEY.Shift, SHORTCUT_KEY.Space] },
  {
    labelKey: 'shortcuts.items.selectAll',
    keys: [SHORTCUT_KEY.Command, letterKey(LINK_SELECT_SHORTCUT.SelectAllKey)],
  },
  { labelKey: 'shortcuts.items.moveLink', keys: [letterKey(LINK_SELECT_SHORTCUT.MoveKey)] },
  { labelKey: 'shortcuts.items.clearSelection', keys: [SHORTCUT_KEY.Escape] },
  // ui-tree (folders) and the sidebar tags: arrows, Shift+F10
  { labelKey: 'shortcuts.items.moveFolder', keys: [SHORTCUT_KEY.Up, SHORTCUT_KEY.Down] },
  { labelKey: 'shortcuts.items.toggleFolder', keys: [SHORTCUT_KEY.Left, SHORTCUT_KEY.Right] },
  { labelKey: 'shortcuts.items.folderMenu', keys: [SHORTCUT_KEY.Shift, SHORTCUT_KEY.F10] },
  // SidebarPinnedComponent and the folder rows (#314)
  {
    labelKey: 'shortcuts.items.reorder',
    keys: [SHORTCUT_KEY.Alt, SHORTCUT_KEY.Up, SHORTCUT_KEY.Down],
  },
];

const signature = (shortcut: { labelKey: string; keys: readonly ShortcutKey[] }): string =>
  `${shortcut.labelKey}: ${shortcut.keys.join('+')}`;

describe('SHORTCUT_GROUPS', () => {
  const listed = SHORTCUT_GROUPS.flatMap((group) => group.shortcuts);

  it('lists exactly the shortcuts the key handlers bind, each once', () => {
    expect(listed.map(signature).sort()).toEqual(BOUND.map(signature).sort());
    expect(new Set(listed.map((shortcut) => shortcut.labelKey)).size).toBe(listed.length);
  });

  it('has unique group ids', () => {
    const ids = SHORTCUT_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
