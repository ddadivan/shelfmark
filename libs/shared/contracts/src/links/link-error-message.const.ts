/** Error messages of the links API, one place so the service and the tests agree. */
export const LINK_ERROR_MESSAGE = {
  NotFound: 'Link not found',
  InvalidCursor: 'Invalid cursor',
  FolderAndUnsorted: 'folderId and unsorted cannot be combined',
  LimitReached: 'Link limit reached',
  UrlTooLong: 'URL is too long',
  ChangedMeanwhile: 'A folder or tag changed while saving, try again',
} as const;
