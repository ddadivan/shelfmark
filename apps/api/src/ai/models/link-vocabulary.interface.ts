import type { LinkJobFolder } from './link-job-folder.interface';

/** The user's own tags and folders as the prompt sees them, and the way back from folder keys. */
export interface LinkVocabulary {
  tags: string[];
  folders: LinkJobFolder[];
  folderIdByKey: ReadonlyMap<string, string>;
}
