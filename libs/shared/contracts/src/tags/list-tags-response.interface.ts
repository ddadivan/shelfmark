import type { TagResponse } from './tag-response.interface';

/** `GET /api/tags` response, with link counts, sorted by `linkCount` descending, then by name. */
export interface ListTagsResponse {
  items: TagResponse[];
}
