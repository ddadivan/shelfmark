import type { TagResponse } from './tag-response.interface';

/** `GET /api/tags` response, with link counts. */
export interface ListTagsResponse {
  items: TagResponse[];
}
