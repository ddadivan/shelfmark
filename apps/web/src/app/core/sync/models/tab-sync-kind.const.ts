/**
 * What a tab tells the other tabs of the same browser (tab sync, #268). `LinkSaved`, `LinkChanged`
 * and `LinkRemoved` carry the link or its id; `LibraryChanged` means folders or tags changed (the
 * other tabs reload them and the open feed); `SignedOut` and `SignedIn` follow the session.
 */
export const TAB_SYNC_KIND = {
  LinkSaved: 'link-saved',
  LinkChanged: 'link-changed',
  LinkRemoved: 'link-removed',
  LibraryChanged: 'library-changed',
  SignedOut: 'signed-out',
  SignedIn: 'signed-in',
} as const;
