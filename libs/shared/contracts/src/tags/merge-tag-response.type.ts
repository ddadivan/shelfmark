import type { TagResponse } from './tag-response.interface';

/** `POST /api/tags/:id/merge` response: the surviving target tag with its updated count. */
export type MergeTagResponse = TagResponse;
