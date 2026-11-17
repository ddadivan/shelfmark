import { AI_JOB_STATUS, AI_LIMIT } from '@shelfmark/contracts';
import { summaryPendingMs } from './summary-pending-ms';

const NOW = Date.parse('2026-11-17T12:00:00Z');

describe('summaryPendingMs', () => {
  it('counts down from the save while the job is pending', () => {
    expect(summaryPendingMs(AI_JOB_STATUS.Pending, new Date(NOW - 4000).toISOString(), NOW)).toBe(
      AI_LIMIT.PendingSkeletonMs - 4000,
    );
    // A clock a little behind the server's still shows the whole window, not more.
    expect(summaryPendingMs(AI_JOB_STATUS.Pending, new Date(NOW + 2000).toISOString(), NOW)).toBe(
      AI_LIMIT.PendingSkeletonMs,
    );
  });

  it('is 0 once the window passed, for other states and without a date', () => {
    const old = new Date(NOW - AI_LIMIT.PendingSkeletonMs - 1).toISOString();
    expect(summaryPendingMs(AI_JOB_STATUS.Pending, old, NOW)).toBe(0);
    expect(summaryPendingMs(AI_JOB_STATUS.Done, new Date(NOW).toISOString(), NOW)).toBe(0);
    expect(summaryPendingMs(null, new Date(NOW).toISOString(), NOW)).toBe(0);
    expect(summaryPendingMs(AI_JOB_STATUS.Pending, undefined, NOW)).toBe(0);
    expect(summaryPendingMs(AI_JOB_STATUS.Pending, 'not a date', NOW)).toBe(0);
  });
});
