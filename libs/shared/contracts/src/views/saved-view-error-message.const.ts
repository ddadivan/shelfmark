import { SAVED_VIEW_LIMIT } from './saved-view-limit.const';

/** Error messages of the saved views API. */
export const SAVED_VIEW_ERROR_MESSAGE = {
  NotFound: 'View not found',
  FolderNotFound: 'Folder not found',
  FolderRequired: 'A folder view needs folderId',
  FolderNotAllowed: 'folderId is only allowed with the folder scope',
  NameEmpty: 'name must not be empty',
  LimitReached: `At most ${SAVED_VIEW_LIMIT.PerUserMax} views can be saved`,
  OrderMismatch: 'The order must list every view exactly once',
} as const;
