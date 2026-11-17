import { AUTH_ENDPOINT, RULE_ENDPOINT } from '@shelfmark/contracts';

/** The API routes the popup calls, relative to `SHELFMARK_ORIGIN`. */
export const SHELFMARK_ENDPOINT = {
  Session: AUTH_ENDPOINT.GetSession,
  Folders: '/api/folders',
  Tags: '/api/tags',
  Rules: RULE_ENDPOINT,
  Links: '/api/links',
  LinkLookup: '/api/links/lookup',
} as const;
