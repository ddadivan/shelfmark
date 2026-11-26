/**
 * What a change of the library touched, for `LibraryRefreshService.afterChange`: each flag says a
 * store (or the other tabs) must read again. A flag left out is left alone.
 */
export interface LibraryChange {
  /** The open feed and the recent list (a coarse change: many links, tags or folders moved). */
  readonly links?: boolean;
  /** The sidebar folders and their counts. */
  readonly folders?: boolean;
  /** The tags and their counts (also the names of tags a link brought along). */
  readonly tags?: boolean;
  /** Trash (a no-op until it was opened). */
  readonly trash?: boolean;
  /** The due badge and the Reminders lists. */
  readonly reminders?: boolean;
  /** The counts of the saved views. */
  readonly views?: boolean;
  /** The pinned rows of the sidebar. */
  readonly pins?: boolean;
  /** The "Tidy with suggestions" count. */
  readonly tidy?: boolean;
  /** Tell the other tabs (`LibraryChanged`); never set it when applying what another tab posted. */
  readonly broadcast?: boolean;
}
