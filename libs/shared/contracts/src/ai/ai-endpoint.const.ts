/** AI routes (#389–#391, ADR 0049). `:id` is a job, suggestion or link id as named. */
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
  /** `DELETE` every AI summary, suggestion and vector of the user and turns search by meaning off; user edits stay. */
  Data: '/api/ai/data',
  /** `GET` the Tidy review list: links in Unsorted with suggestions (AI-2). */
  Tidy: '/api/ai/tidy',
  /** `GET` how many links Tidy would list. */
  TidyCount: '/api/ai/tidy/count',
  /** `POST` applies the selected suggestions of one run. */
  TidyApply: '/api/ai/tidy/apply',
  /** `POST` reverts a run with the `undo` payload of its apply response. */
  TidyUndo: '/api/ai/tidy/undo',
  /** `GET` the AI state of one link (summary, suggestions, auto-applied marks). */
  LinkAi: '/api/links/:id/ai',
  /** `POST` asks for a new summary (counts against the monthly limit). */
  LinkAiRewrite: '/api/links/:id/ai/rewrite',
  /** `POST` undoes what Automatic mode applied to a link. */
  LinkAiUndo: '/api/links/:id/ai/undo',
  /** `GET` links found by meaning that are not word matches (AI-3). */
  MeaningSearch: '/api/ai/search',
  /** `GET` up to five related links by the link's stored vector (AI-3). */
  RelatedLinks: '/api/links/:id/related',
  /** `POST` a question; answers a `text/event-stream` of `AskEvent`s (AI-4, ADR 0052). */
  Ask: '/api/ai/ask',
  /** Daily Vercel Cron sweep (`CRON_SECRET` bearer). */
  Sweep: '/api/cron/ai-sweep',
} as const;
