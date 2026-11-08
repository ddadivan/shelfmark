/** The filters shared by the list endpoint (and, later, the export): what narrows a user's links. */
export interface LinkFilter {
  /** Direct children of this folder. */
  folderId?: string;
  /** Only links without a folder. */
  unsorted?: boolean;
  favorite?: boolean;
  /** Normalized tag names; a link must have all of them. */
  tag?: readonly string[];
  /** Free text; split into words, every word must match the title, note or URL. */
  q?: string;
}
