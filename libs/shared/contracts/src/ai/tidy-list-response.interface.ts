import type { TidyItem } from './tidy-item.interface';

/** `GET /api/ai/tidy`: newest first, at most `TIDY_LIMIT.PageMax` items; `total` counts all. */
export interface TidyListResponse {
  items: TidyItem[];
  total: number;
}
