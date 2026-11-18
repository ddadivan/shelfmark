import type { AskAllowance, AskSource } from '@shelfmark/contracts';
import type { StreamingSegment } from '@shelfmark/ui';
import type { AskEntryReason } from './ask-entry-reason.type';
import type { AskEntryState } from './ask-entry-state.type';

/** One question of the Ask panel and its answer, kept in memory until the panel closes. */
export interface AskEntry {
  readonly id: number;
  readonly question: string;
  readonly state: AskEntryState;
  /** The answer so far: text and citations in reading order. */
  readonly segments: readonly StreamingSegment[];
  /** Cited links, live, from the `done` event. */
  readonly sources: readonly AskSource[];
  /**
   * The `done` event arrived, so `sources` is the live list and a citation without a source is a
   * trashed link. After Stop or a broken stream it stays `false` and no citation is disabled.
   */
  readonly sourcesKnown: boolean;
  /** Nothing in the links answers it: "Search" and "Add a link" are offered. */
  readonly notFound: boolean;
  /** The answer was cut (cap, deadline, failure after text) or stopped. */
  readonly truncated: boolean;
  /** Why it ended with `error` or `limit`. */
  readonly reason: AskEntryReason | null;
  /** The limit line's allowance (`limit`), `null` otherwise. */
  readonly allowance: AskAllowance | null;
}
