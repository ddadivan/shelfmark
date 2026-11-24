import { BULK_TAG_STATE } from '../models/bulk-tag-state.const';
import type { BulkTagRow } from '../models/bulk-tag-row.interface';
import { bulkTagsChange, initialTagState, nextTagState } from './bulk-tag-rows';

const row = (name: string, initial: BulkTagRow['initial'], state = initial): BulkTagRow => ({
  name,
  count: 0,
  initial,
  state,
});

describe('bulk tag rows', () => {
  it('reads the state from the count', () => {
    expect(initialTagState(3, 3)).toBe(BULK_TAG_STATE.All);
    expect(initialTagState(1, 3)).toBe(BULK_TAG_STATE.Some);
    expect(initialTagState(0, 3)).toBe(BULK_TAG_STATE.None);
  });

  it('cycles a tick and an empty box, and a dash back to a dash', () => {
    expect(nextTagState(BULK_TAG_STATE.None, BULK_TAG_STATE.None)).toBe(BULK_TAG_STATE.All);
    expect(nextTagState(BULK_TAG_STATE.All, BULK_TAG_STATE.None)).toBe(BULK_TAG_STATE.None);
    expect(nextTagState(BULK_TAG_STATE.All, BULK_TAG_STATE.All)).toBe(BULK_TAG_STATE.None);
    expect(nextTagState(BULK_TAG_STATE.Some, BULK_TAG_STATE.Some)).toBe(BULK_TAG_STATE.All);
    expect(nextTagState(BULK_TAG_STATE.All, BULK_TAG_STATE.Some)).toBe(BULK_TAG_STATE.Some);
  });

  it('adds new ticks and removes emptied tags, leaving untouched ones out', () => {
    expect(
      bulkTagsChange([
        row('angular', BULK_TAG_STATE.All),
        row('reading', BULK_TAG_STATE.Some, BULK_TAG_STATE.All),
        row('recipes', BULK_TAG_STATE.Some),
        row('video', BULK_TAG_STATE.None, BULK_TAG_STATE.All),
        row('css', BULK_TAG_STATE.All, BULK_TAG_STATE.None),
      ]),
    ).toEqual({ add: ['reading', 'video'], remove: ['css'] });
  });
});
