/** AI routes (#389–#391, ADR 0048). `:id` is a job, suggestion or link id as named. */
export const AI_ENDPOINT = {
  /** `GET` the settings with usage, entitlements and status; `PATCH` to change them. */
  Settings: '/api/ai/settings',
  /** `POST` a draft job from Add link once the preview has loaded. */
  Drafts: '/api/ai/drafts',
  /** `GET` a draft job (poll). */
  Job: '/api/ai/jobs/:id',
  /** `POST` hides a suggestion for its link for good. */
  DismissSuggestion: '/api/ai/suggestions/:id/dismiss',
  /** `GET` status, `POST` start, `DELETE` stop "Process existing links". */
  Backfill: '/api/ai/backfill',
  /** `POST` catch-up for the session user while jobs are pending or a backfill runs. */
  Tick: '/api/ai/tick',
  /** `DELETE` every AI summary and suggestion of the user; user edits stay. */
  Data: '/api/ai/data',
  /** `GET` the AI state of one link (summary, suggestions, auto-applied marks). */
  LinkAi: '/api/links/:id/ai',
  /** `POST` asks for a new summary (counts against the monthly limit). */
  LinkAiRewrite: '/api/links/:id/ai/rewrite',
  /** `POST` undoes what Automatic mode applied to a link. */
  LinkAiUndo: '/api/links/:id/ai/undo',
  /** Daily Vercel Cron sweep (`CRON_SECRET` bearer). */
  Sweep: '/api/cron/ai-sweep',
} as const;
