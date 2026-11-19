import type { ImportGroupLink } from './import-group-link.interface';

/**
 * `POST /api/imports/groups` body (step 2a, "AI groups by topic"): the links the import would send
 * and the file's folder names as hints. Nothing is written except the allowance it uses.
 */
export interface ImportGroupsRequest {
  /** 1 to `IMPORT_LIMIT.GroupLinksMax` links. */
  links: ImportGroupLink[];
  /** The file's folder names, at most `IMPORT_LIMIT.GroupFolderNamesMax`, each at most `FOLDER_LIMIT.NameMax`. */
  folderNames: string[];
}
