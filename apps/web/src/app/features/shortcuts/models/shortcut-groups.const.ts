import type { ShortcutGroup } from './shortcut-group.interface';
import { SHORTCUT_KEY } from './shortcut-key.const';

/**
 * Every shortcut the app really has (read from the code, not from the mockups, which draw many
 * more): search (`SearchDialogService`), Esc (dialogs, menus, toasts), undo and the toast action
 * (`ToastService`), save in the link dialog, paste links into the library (`LibraryPage`), the
 * search results, the folder tree and reordering the sidebar (Alt+Up / Alt+Down).
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
