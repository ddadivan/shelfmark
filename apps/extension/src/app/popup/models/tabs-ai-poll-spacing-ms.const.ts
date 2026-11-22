/** Minimum time per polled job in one round: keeps the polling under the API's request limit (120 requests a minute per client for `GET /api/ai/jobs/:id`, shared with every other call). */
export const TABS_AI_POLL_SPACING_MS = 800;
