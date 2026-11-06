/**
 * `KeyboardEvent.key` values the components handle (the rest of the keyboard is Angular Aria's).
 * The event type declares `key` as `string`, so compare through this object, never a literal.
 */
export const KEYBOARD_KEY = {
  ArrowDown: 'ArrowDown',
  ArrowUp: 'ArrowUp',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Enter: 'Enter',
  Escape: 'Escape',
  Home: 'Home',
  End: 'End',
  Tab: 'Tab',
  Space: ' ',
  Delete: 'Delete',
  Backspace: 'Backspace',
  ContextMenu: 'ContextMenu',
  F10: 'F10',
} as const;
