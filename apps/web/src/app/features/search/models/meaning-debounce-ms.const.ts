/**
 * Extra pause after the word answer for a query has settled before search asks for meaning matches
 * (AI-3): each settled query costs one embedding call, so a text still being typed never does.
 */
export const MEANING_DEBOUNCE_MS = 400;
