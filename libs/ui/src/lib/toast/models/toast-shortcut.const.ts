/**
 * The global shortcut that moves focus to the action of the toast on screen: Alt+Shift+T.
 * `code` keeps it working on layouts where Alt changes the character; no browser binds it.
 */
export const TOAST_SHORTCUT = { code: 'KeyT', label: 'Alt+Shift+T' } as const;
