import type { AskAllowance, AskSource, AskTurn } from '@shelfmark/contracts';
import type { StreamingSegment } from '@shelfmark/ui';
import type { AskCardGroup } from './ask-card-group.interface';
import type { AskEntryActivity } from './ask-entry-activity.interface';
import type { AskEntryReason } from './ask-entry-reason.type';
import type { AskEntryState } from './ask-entry-state.type';

/** One question of the Ask chat and its answer, kept in memory until the panel closes. */
export interface AskEntry {
  readonly id: number;
  readonly question: string;
  readonly state: AskEntryState;
  /** The answer so far: text and citations in reading order. */
  readonly segments: readonly StreamingSegment[];
  /** Link cards in stream order (`show_links`), numbered like the citations. */
  readonly cards: readonly AskCardGroup[];
  /** The status pill while tools run, `null` when nothing runs (or text is streaming). */
  readonly activity: AskEntryActivity | null;
  /** The turn the server wrote (`done.turn`), sent back with the next question; `null` until done. */
  readonly turn: AskTurn | null;
  /** Cited and shown links, live, from the `done` event. */
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
