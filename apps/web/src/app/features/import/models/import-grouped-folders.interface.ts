/** The folders an import with AI groups filed its links into. */
export interface ImportGroupedFolders {
  /** Distinct folders that got a link (new and existing). */
  readonly folders: number;
  /** How many of them this import created. */
  readonly created: number;
}
