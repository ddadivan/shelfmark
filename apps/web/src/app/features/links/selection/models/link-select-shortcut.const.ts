/**
 * Letter shortcuts of the feed selection (#267): M moves the focused link, Cmd/Ctrl+A selects every
 * link in the feed. Like the search shortcut, a Latin `key` decides, else the physical `code`.
 */
export const LINK_SELECT_SHORTCUT = {
  MoveKey: 'm',
  MoveCode: 'KeyM',
  SelectAllKey: 'a',
  SelectAllCode: 'KeyA',
} as const;
