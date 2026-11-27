import { describe, expect, it, vi } from 'vitest';
import { runBatchedWithBudget } from './run-batched-with-budget';

function fakeClock(ticks: readonly number[]): () => number {
  let index = 0;
  return () => ticks[Math.min(index++, ticks.length - 1)] ?? 0;
}

describe('runBatchedWithBudget', () => {
  it('stops on a short batch without asking for more work', async () => {
    const step = vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const anyLeft = vi.fn();
    const result = await runBatchedWithBudget({ batchSize: 3, budgetMs: 1000, step, anyLeft });
    expect(result).toEqual({ processed: 4, hasMore: false, budgetEnded: false });
    expect(step).toHaveBeenCalledTimes(2);
    expect(anyLeft).not.toHaveBeenCalled();
  });

  it('stops on an empty first batch', async () => {
    const result = await runBatchedWithBudget({
      batchSize: 2,
      budgetMs: 1000,
      step: () => Promise.resolve(0),
      anyLeft: () => Promise.resolve(true),
    });
    expect(result).toEqual({ processed: 0, hasMore: false, budgetEnded: false });
  });

  it('stops after a full batch once the budget is used and reports what is left', async () => {
    const step = vi.fn().mockResolvedValue(2);
    // started = 0, after batch 1: 500 (within budget), after batch 2: 1000 (used up).
    const result = await runBatchedWithBudget({
      batchSize: 2,
      budgetMs: 1000,
      step,
      anyLeft: () => Promise.resolve(true),
      now: fakeClock([0, 500, 1000]),
    });
    expect(result).toEqual({ processed: 4, hasMore: true, budgetEnded: true });
    expect(step).toHaveBeenCalledTimes(2);
  });

  it('hasMore is false when the budget ended a run that left nothing', async () => {
    const result = await runBatchedWithBudget({
      batchSize: 1,
      budgetMs: 10,
      step: () => Promise.resolve(1),
      anyLeft: () => Promise.resolve(false),
      now: fakeClock([0, 10]),
    });
    expect(result).toEqual({ processed: 1, hasMore: false, budgetEnded: true });
  });

  it('shares one budget across phases through startedAt', async () => {
    const result = await runBatchedWithBudget({
      batchSize: 1,
      budgetMs: 100,
      step: () => Promise.resolve(1),
      anyLeft: () => Promise.resolve(true),
      now: () => 150,
      startedAt: 0,
    });
    expect(result.budgetEnded).toBe(true);
  });
});
