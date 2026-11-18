/**
 * How many of the user's Unsorted links with an open suggestion Tidy reads per list or count
 * (AI-2): newest first, so a very large Unsorted stays one bounded read; `total` then counts what
 * was read (the button and the page never need more than a few pages).
 */
export const TIDY_SCAN = {
  RowsMax: 500,
} as const;
