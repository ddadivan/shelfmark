import type { LinkResponse } from './link-response.interface';

/** `GET /api/links/recent` response, ordered by `lastOpenedAt` descending. */
export interface RecentLinksResponse {
  items: LinkResponse[];
}
