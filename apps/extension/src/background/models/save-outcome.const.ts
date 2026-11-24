/** How a right-click save ended; each one has its own badge and tooltip. */
export const SAVE_OUTCOME = {
  Saved: 'saved',
  AlreadySaved: 'alreadySaved',
  SignedOut: 'signedOut',
  Unsupported: 'unsupported',
  LibraryFull: 'libraryFull',
  Failed: 'failed',
} as const;
