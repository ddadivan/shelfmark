import type { LinkResponse } from '../links/link-response.interface';
import type { RediscoverMode } from './rediscover-mode.type';

/** `GET /api/rediscover`: this week's "From your shelf" block. */
export interface RediscoverResponse {
  /** ISO week in UTC, e.g. `2026-W47`. */
  week: string;
  /** `null` when there is no block. */
  mode: RediscoverMode | null;
  /** Tag or folder name of the recent theme in `theme` mode, else `null`. */
  theme: string | null;
  /** 3 to 5 live links of the user; empty = no block (dismissed this week or too few candidates). */
  items: LinkResponse[];
}
