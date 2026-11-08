/** Error messages of the tags API, one place so the service and the tests agree. */
export const TAG_ERROR_MESSAGE = {
  NotFound: 'Tag not found',
  LimitReached: 'Tag limit reached',
  NameTaken: 'A tag with this name already exists',
  NameTooLong: 'Tag name is too long',
  MergeIntoItself: 'Cannot merge a tag into itself',
} as const;
