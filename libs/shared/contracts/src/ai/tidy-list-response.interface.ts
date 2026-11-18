import type { TidyItem } from './tidy-item.interface';

/**
 * `GET /api/ai/tidy`: newest first, at most `TIDY_LIMIT.PageMax` items; `total` counts all from the
 * start of this page on (all of them without `after`).
 */
export interface TidyListResponse {
  items: TidyItem[];
  total: number;
}
