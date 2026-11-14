/** What the right half of the side-by-side view is (see `SplitRight`). */
export const SPLIT_RIGHT_KIND = {
  /** No `?split`: one feed. */
  Closed: 'closed',
  /** `?split` with no valid target: the right half asks for a folder. */
  Picker: 'picker',
  Unsorted: 'unsorted',
  Folder: 'folder',
} as const;
