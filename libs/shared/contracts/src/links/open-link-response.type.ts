import type { LinkResponse } from './link-response.interface';

/** `POST /api/links/:id/open` response: the link with `lastOpenedAt` updated. */
export type OpenLinkResponse = LinkResponse;
