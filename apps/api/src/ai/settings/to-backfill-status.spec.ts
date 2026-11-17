import { toStoredAiSettings } from './to-ai-settings';
import { toBackfillStatus } from './to-backfill-status';

const base = toStoredAiSettings(null);

describe('toBackfillStatus', () => {
  it('estimates the eligible links while idle and hides the last run', () => {
    expect(toBackfillStatus({ ...base, backfillTotal: 9, backfillDone: 9 }, 200)).toEqual({
      state: 'idle',
      eligible: 200,
      total: 0,
      done: 0,
      estimatedMinutes: 3,
    });
  });

  it('answers null minutes when nothing is left', () => {
    expect(toBackfillStatus(base, 0).estimatedMinutes).toBeNull();
    const finished = {
      ...base,
      backfillState: 'running' as const,
      backfillTotal: 5,
      backfillDone: 7,
    };
    expect(toBackfillStatus(finished, 0)).toMatchObject({
      total: 5,
      done: 5,
      estimatedMinutes: null,
    });
  });

  it('reports the progress of a running backfill', () => {
    const running = {
      ...base,
      backfillState: 'running' as const,
      backfillTotal: 100,
      backfillDone: 10,
    };
    expect(toBackfillStatus(running, 400)).toEqual({
      state: 'running',
      eligible: 400,
      total: 100,
      done: 10,
      estimatedMinutes: 2,
    });
  });

  it('keeps the numbers of a stopped run', () => {
    const stopped = {
      ...base,
      backfillState: 'stopped' as const,
      backfillTotal: 50,
      backfillDone: 20,
    };
    expect(toBackfillStatus(stopped, 30)).toMatchObject({
      total: 50,
      done: 20,
      estimatedMinutes: 1,
    });
  });
});
