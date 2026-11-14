/** Buckets of the live links per real user, smallest first (`0`, `1-9`, ..., `100+`). */
export const ADMIN_STATS_LINKS_BUCKET = {
  None: '0',
  Few: '1-9',
  Some: '10-49',
  Many: '50-99',
  Lots: '100+',
} as const;
