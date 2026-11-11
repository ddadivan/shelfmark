/** Error messages of `POST /api/links/batch/update`, one place so the service and the tests agree. */
export const LINKS_BATCH_ERROR_MESSAGE = {
  NothingToChange: 'Send at least one of folderId, addTags, removeTags or isFavorite',
  TagAddedAndRemoved: 'A tag cannot be added and removed in the same request',
  TooManyTags: 'A link can have at most 20 tags',
} as const;
