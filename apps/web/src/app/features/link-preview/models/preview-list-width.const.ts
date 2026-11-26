/**
 * The compact list beside the preview (#553), in CSS pixels: the design's 400 by default, the
 * resize handle keeps it from `Min` up to the room left once the panel and the handle together
 * are `PanelMin` wide (#555;
 * `Max` only caps a stored value). The width is a device preference in `localStorage`
 * (`STORAGE_KEY.PreviewWidth`).
 */
export const PREVIEW_LIST_WIDTH = {
  Default: 400,
  Min: 300,
  Max: 2400,
  PanelMin: 480,
} as const;
