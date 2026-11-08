import { FOLDER_LIMIT } from './folder-limit.const';

/** Error messages of the folders API, one place so the service, the tests and the web agree. */
export const FOLDER_ERROR_MESSAGE = {
  NotFound: 'Folder not found',
  LimitReached: `Folder limit reached (${FOLDER_LIMIT.PerUserMax})`,
  MoveIntoDescendant: 'A folder cannot be moved into itself or a subfolder',
} as const;
