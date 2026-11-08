/**
 * The global shortcut that moves focus to the action of the toast on screen: Alt+Shift+T
 * (Option+Shift+T on macOS, see `toastShortcutLabel`). It matches `code`, so layouts where Alt
 * changes the character still work.
 *
 * Chrome on Windows and Linux binds Alt+Shift+T itself (focus the first toolbar item). The page
 * gets the keydown first and `handleShortcut` cancels it, so the page wins while the app has
 * focus; that is worth checking by hand in each browser. The combination avoids the keys screen
 * readers use (NVDA and JAWS: Insert or CapsLock; VoiceOver: Ctrl+Option).
 */
export const TOAST_SHORTCUT = { code: 'KeyT' } as const;
