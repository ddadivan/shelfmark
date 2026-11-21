import { PREVIEW_LIST_WIDTH } from '../models/preview-list-width.const';

/** A stored or dragged list width kept inside `PREVIEW_LIST_WIDTH`; anything else is the default. */
export function clampListWidth(value: unknown): number {
  const width = typeof value === 'string' ? Number(value) : value;
  if (typeof width !== 'number' || !Number.isFinite(width)) {
    return PREVIEW_LIST_WIDTH.Default;
  }
  return Math.round(Math.min(PREVIEW_LIST_WIDTH.Max, Math.max(PREVIEW_LIST_WIDTH.Min, width)));
}
