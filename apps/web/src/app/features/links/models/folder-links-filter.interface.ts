import type { LINKS_SCOPE } from './links-scope.const';
import type { LinksFilterOptions } from './links-filter-options.interface';

/** The links of one folder; the folder is required. */
export interface FolderLinksFilter extends LinksFilterOptions {
  readonly scope: typeof LINKS_SCOPE.Folder;
  readonly folderId: string;
}
