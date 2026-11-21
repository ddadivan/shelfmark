/**
 * The compact list beside the preview (#553), in CSS pixels: the design's 400 by default, the
 * resize handle keeps it between `Min` and `Max`. The width is a device preference in
 * `localStorage` (`StorageKey`, not in `USER_STORAGE_KEYS`).
 */
export const PREVIEW_LIST_WIDTH = {
  Default: 400,
  Min: 300,
  Max: 640,
  StorageKey: 'sm-preview-width',
} as const;
