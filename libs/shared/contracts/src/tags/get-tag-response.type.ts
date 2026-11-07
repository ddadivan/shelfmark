import type { TagResponse } from './tag-response.interface';

/** `GET /api/tags/:id` response: the tag with its current link count; 404 for an unknown or foreign id. */
export type GetTagResponse = TagResponse;
