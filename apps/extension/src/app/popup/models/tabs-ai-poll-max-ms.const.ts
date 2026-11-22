/**
 * How long "Sort with AI" for tabs waits for the drafts. Longer than one page's wait (many drafts run
 * one after another); a tab still waiting after it saves without suggestions, the server finishes its draft.
 */
export const TABS_AI_POLL_MAX_MS = 30_000;
