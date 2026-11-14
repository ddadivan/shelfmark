/** Endpoints of the "Recently opened" history (`GET /api/links/recent` is in `RecentLinksQuery`). */
export const RECENT_LINKS_ENDPOINT = {
  /** `DELETE`: clears the whole history of the session user; 204. */
  Clear: '/api/links/recent',
  /** `DELETE`: removes one link from the history (the link stays); 204, 404 for a foreign or missing link. `:id` is the link id. */
  Remove: '/api/links/recent/:id',
} as const;
