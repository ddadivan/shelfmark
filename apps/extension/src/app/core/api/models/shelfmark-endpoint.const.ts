import { AI_ENDPOINT, AUTH_ENDPOINT, RULE_ENDPOINT } from '@shelfmark/contracts';

/** The API routes the popup calls, relative to `SHELFMARK_ORIGIN`. */
export const SHELFMARK_ENDPOINT = {
  Session: AUTH_ENDPOINT.GetSession,
  Folders: '/api/folders',
  Tags: '/api/tags',
  Rules: RULE_ENDPOINT,
  Links: '/api/links',
  LinkLookup: '/api/links/lookup',
  AiSettings: AI_ENDPOINT.Settings,
  AiDrafts: AI_ENDPOINT.Drafts,
  /** `:id` is the draft job. */
  AiJob: AI_ENDPOINT.Job,
} as const;
