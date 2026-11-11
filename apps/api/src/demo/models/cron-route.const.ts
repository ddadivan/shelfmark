import { CRON_ENDPOINT } from '@shelfmark/contracts';

/** The cleanup route. `Path` (from the contracts) must equal the `crons` path in `vercel.json` (a spec checks it). */
export const CRON_ROUTE = {
  Controller: 'cron',
  DemoCleanup: 'demo-cleanup',
  Path: CRON_ENDPOINT.DemoCleanup,
  TrashCleanup: 'trash-cleanup',
  TrashCleanupPath: CRON_ENDPOINT.TrashCleanup,
} as const;
