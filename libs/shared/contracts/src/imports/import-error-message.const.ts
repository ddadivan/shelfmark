/** Client-facing import error messages. */
export const IMPORT_ERROR_MESSAGE = {
  NotFound: 'Import not found.',
  Closed: 'This import no longer takes links.',
  UndoGone: 'This import can no longer be undone.',
  FoldersLimit: 'The folders of this file do not fit your folder limit.',
  FolderKeys: 'Every folder needs its own key, and a parent that comes before it.',
  TargetBoth: 'Choose an existing folder or a new folder name, not both.',
} as const;
