/** The cleanup route. `Path` must equal the `crons` path in `vercel.json` (a spec checks it). */
export const CRON_ROUTE = {
  Controller: 'cron',
  DemoCleanup: 'demo-cleanup',
  Path: '/api/cron/demo-cleanup',
} as const;
