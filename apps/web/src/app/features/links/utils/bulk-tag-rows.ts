import type { BulkTagsChange } from '../models/bulk-tags-change.interface';
import type { BulkTagRow } from '../models/bulk-tag-row.interface';
import { BULK_TAG_STATE } from '../models/bulk-tag-state.const';
import type { BulkTagState } from '../models/bulk-tag-state.type';

/** Where a tag carried by `count` of `total` selected links stands. */
export function initialTagState(count: number, total: number): BulkTagState {
  if (count <= 0) {
    return BULK_TAG_STATE.None;
  }
  return count >= total ? BULK_TAG_STATE.All : BULK_TAG_STATE.Some;
}

/**
 * The state after a click: a dash or an empty box turns into a tick (add to all), a tick into an
 * empty box (remove from all). A tag that started with a dash goes back to it after the empty box,
 * so the user can leave it as it was.
 */
export function nextTagState(state: BulkTagState, initial: BulkTagState): BulkTagState {
  if (state !== BULK_TAG_STATE.All) {
    return BULK_TAG_STATE.All;
  }
  return initial === BULK_TAG_STATE.Some ? BULK_TAG_STATE.Some : BULK_TAG_STATE.None;
}

/** What Apply sends: ticked tags that were not on all links, emptied ones that were on some. */
export function bulkTagsChange(rows: readonly BulkTagRow[]): BulkTagsChange {
  return {
    add: rows
      .filter((row) => row.state === BULK_TAG_STATE.All && row.initial !== BULK_TAG_STATE.All)
      .map((row) => row.name),
    remove: rows
      .filter((row) => row.state === BULK_TAG_STATE.None && row.initial !== BULK_TAG_STATE.None)
      .map((row) => row.name),
  };
}
