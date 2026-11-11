/**
 * Where a feedback message stands (author decision, Nov 10, 2026). New messages are `Received`;
 * the author sets the others in the database (docs/SETUP.md) until an admin page exists.
 */
export const FEEDBACK_STATUS = {
  Received: 'received',
  Planned: 'planned',
  InProgress: 'in-progress',
  Done: 'done',
  NotPlanned: 'not-planned',
} as const;
