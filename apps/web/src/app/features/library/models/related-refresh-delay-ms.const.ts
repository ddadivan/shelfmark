/**
 * How long "Show related" waits before asking again after the related link's title, note, tags or
 * summary changed (AI-3): the embed pass starts after the save's response and rebuilds the vector
 * within about a second, so the new neighbours are there by then.
 */
export const RELATED_REFRESH_DELAY_MS = 2000;
