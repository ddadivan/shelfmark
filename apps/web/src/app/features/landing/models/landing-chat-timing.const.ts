/**
 * Timings of the hero chat loop (PROJECT.md story 20). The Motion tokens stop at 320 ms; the
 * landing illustration is the one place that may run longer, so these are named constants.
 */
export const LANDING_CHAT_TIMING = {
  /** A new message arrives this often. */
  MessageIntervalMs: 1800,
  /** The feed rises by one message over this long (`transform` only). */
  RiseMs: 650,
  /** "Put them on the shelf": time the messages need to clear before the shelf shows. */
  ClearMs: 520,
  /** Delay between two folders landing on the shelf. */
  GroupStaggerMs: 160,
  /** The feed bubbles are rendered this many at a time, so no single task renders them all. */
  BatchSize: 3,
  /** Pause between two batches of feed bubbles. */
  BatchMs: 40,
  /** Delay between two cards landing on the shelf. */
  CardStaggerMs: 80,
} as const;
