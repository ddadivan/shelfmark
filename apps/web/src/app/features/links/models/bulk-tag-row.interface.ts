import type { BulkTagState } from './bulk-tag-state.type';

/** One tag of the bulk Tags list: its name, how many selected links carry it, and the choice. */
export interface BulkTagRow {
  readonly name: string;
  /** Selected links that carry the tag now (0 for a tag none of them has, or a new one). */
  readonly count: number;
  /** Where the tag stands now, before Apply. */
  readonly initial: BulkTagState;
  /** Where Apply would leave it. */
  readonly state: BulkTagState;
}
