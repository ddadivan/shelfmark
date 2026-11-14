import type { ShortcutGroup } from './shortcut-group.interface';
import { SHORTCUT_KEY } from './shortcut-key.const';

/**
 * The one list of every shortcut the app really has (read from the code, not from the mockups,
 * which draw many more). The "?" dialog and Settings › Keyboard shortcuts both render it, and
 * `shortcut-groups.spec.ts` compares it with the key handlers: search (`SearchDialogService`), the
 * list ("?", `ShortcutsDialogService`), Esc (dialogs, menus, toasts), undo and the toast action
 * (`ToastService`), save in the link dialog, paste links into the library (`LibraryPage`), the
 * search results, the feed selection (`LibraryPage`, `linkKeyIntent`), the folder tree and
 * reordering the sidebar (Alt+Up / Alt+Down). A new key handler adds its row here.
 */
export const SHORTCUT_GROUPS: readonly ShortcutGroup[] = [
  {
    id: 'everywhere',
    titleKey: 'shortcuts.groups.everywhere',
    shortcuts: [
      { labelKey: 'shortcuts.items.search', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.K] },
      { labelKey: 'shortcuts.items.list', keys: [SHORTCUT_KEY.Question] },
      { labelKey: 'shortcuts.items.close', keys: [SHORTCUT_KEY.Escape] },
      { labelKey: 'shortcuts.items.undo', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.Z] },
      {
        labelKey: 'shortcuts.items.toastAction',
        keys: [SHORTCUT_KEY.Alt, SHORTCUT_KEY.Shift, SHORTCUT_KEY.T],
      },
    ],
  },
  {
    id: 'links',
    titleKey: 'shortcuts.groups.links',
    shortcuts: [
      { labelKey: 'shortcuts.items.save', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.Enter] },
      { labelKey: 'shortcuts.items.paste', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.V] },
      { labelKey: 'shortcuts.items.results', keys: [SHORTCUT_KEY.Up, SHORTCUT_KEY.Down] },
      { labelKey: 'shortcuts.items.openResult', keys: [SHORTCUT_KEY.Enter] },
      {
        labelKey: 'shortcuts.items.openBackground',
        keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.Enter],
      },
    ],
  },
  {
    id: 'selecting',
    titleKey: 'shortcuts.groups.selecting',
    shortcuts: [
      { labelKey: 'shortcuts.items.select', keys: [SHORTCUT_KEY.Space] },
      { labelKey: 'shortcuts.items.selectRange', keys: [SHORTCUT_KEY.Shift, SHORTCUT_KEY.Space] },
      { labelKey: 'shortcuts.items.selectAll', keys: [SHORTCUT_KEY.Command, SHORTCUT_KEY.A] },
      { labelKey: 'shortcuts.items.moveLink', keys: [SHORTCUT_KEY.M] },
      { labelKey: 'shortcuts.items.clearSelection', keys: [SHORTCUT_KEY.Escape] },
    ],
  },
  {
    id: 'folders',
    titleKey: 'shortcuts.groups.folders',
    shortcuts: [
      { labelKey: 'shortcuts.items.moveFolder', keys: [SHORTCUT_KEY.Up, SHORTCUT_KEY.Down] },
      { labelKey: 'shortcuts.items.toggleFolder', keys: [SHORTCUT_KEY.Left, SHORTCUT_KEY.Right] },
      { labelKey: 'shortcuts.items.folderMenu', keys: [SHORTCUT_KEY.Shift, SHORTCUT_KEY.F10] },
      // The sidebar's Pinned rows and folder rows (#314): the keyboard route of dragging.
      {
        labelKey: 'shortcuts.items.reorder',
        keys: [SHORTCUT_KEY.Alt, SHORTCUT_KEY.Up, SHORTCUT_KEY.Down],
      },
    ],
  },
];
