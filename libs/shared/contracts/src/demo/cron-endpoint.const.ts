/** Cron routes. The path must equal the `crons` path in `vercel.json` (an API spec checks it). */
export const CRON_ENDPOINT = {
  DemoCleanup: '/api/cron/demo-cleanup',
  TrashCleanup: '/api/cron/trash-cleanup',
} as const;
