/** Cron routes. The path must equal the `crons` path in `vercel.json` (an API spec checks it). */
export const CRON_ENDPOINT = {
  DemoCleanup: '/api/cron/demo-cleanup',
  TrashCleanup: '/api/cron/trash-cleanup',
  AiSweep: '/api/cron/ai-sweep',
  Notifications: '/api/cron/notifications',
  AccountPurge: '/api/cron/account-purge',
} as const;
