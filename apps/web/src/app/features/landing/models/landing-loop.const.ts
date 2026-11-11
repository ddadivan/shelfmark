/** Timing of the landing scene loops (PROJECT.md story 20). */
export const LANDING_LOOP = {
  /** One full pass of the shelf through every folder of the cycle. */
  ShelfCycleMs: 9000,
  /**
   * The hero preview's switch: how long "All" holds (the first time it also covers the cards
   * landing and the toast, about a second) and how long "Articles" holds before it switches back.
   */
  PreviewAllHoldMs: 4200,
  PreviewArticlesHoldMs: 3200,
} as const;
