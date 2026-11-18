import type { CleanupSource } from '@shelfmark/contracts';

/** A similar-tags pair as stored in the report: ids only; the kept tag is chosen live when read. */
export interface StoredTagPair {
  id: string;
  source: CleanupSource;
  /** Two distinct tag ids of the user, the suggested keep first. */
  tagIds: [string, string];
}
