/**
 * How the web app follows the AI pass of an import (`GET /api/imports/:id`): the first read after
 * `FirstMs`, then every `EveryMs`, for at most `MaxMs` (a pass that is still running then is left
 * to Tidy and Settings).
 */
export const IMPORT_AI_POLL = {
  FirstMs: 5_000,
  EveryMs: 15_000,
  MaxMs: 60 * 60 * 1000,
} as const;
