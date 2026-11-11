/** Error messages of the links API, one place so the service and the tests agree. */
export const LINK_ERROR_MESSAGE = {
  NotFound: 'Link not found',
  InvalidCursor: 'Invalid cursor',
  FolderAndUnsorted: 'folderId and unsorted cannot be combined',
  LimitReached: 'Link limit reached',
  DemoLimitReached: 'Demo link limit reached',
  UrlTooLong: 'URL is too long',
  DuplicateIdempotencyKey: 'Every item needs its own idempotencyKey',
  PinNeedsFolder: 'Only a link in a folder can be pinned to the top of it',
  PinnedInFolderLimit: 'Too many pinned links in this folder',
  ChangedMeanwhile: 'A folder or tag changed while saving, try again',
} as const;
