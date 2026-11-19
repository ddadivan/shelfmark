/**
 * "Folders inside" of the review step (ImportExport.dc.html, step 2): the file's folders, AI groups
 * by topic, or no folders (one list in the target).
 */
export const IMPORT_FOLDERS_MODE = {
  File: 'file',
  Ai: 'ai',
  None: 'none',
} as const;
