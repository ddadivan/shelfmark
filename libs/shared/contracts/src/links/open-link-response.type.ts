import type { LinkResponse } from './link-response.interface';

/**
 * `POST /api/links/:id/open` response: the link as it is now. `recorded` is `false` while the
 * user's history is paused (`pauseHistory` in `/api/me/settings`): the open is not written and
 * `lastOpenedAt` keeps its earlier value.
 */
export type OpenLinkResponse = LinkResponse & { recorded: boolean };
