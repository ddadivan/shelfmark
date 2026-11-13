/** Sizes of the lists in `MeStatsResponse` (#352). */
export const ME_STATS_LIMIT = {
  /** Sites in `topSites`. */
  TopSites: 5,
  /** Tags in `topTags`. */
  TopTags: 5,
  /** Weeks in `weeklyLinks`, the current one last. */
  Weeks: 12,
} as const;
