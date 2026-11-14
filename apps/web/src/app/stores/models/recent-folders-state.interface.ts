/** State of `RecentFoldersStore`. */
export interface RecentFoldersState {
  /** Folder ids the user moved links into lately, most recent first; `null` is Unsorted. */
  readonly ids: readonly (string | null)[];
}
