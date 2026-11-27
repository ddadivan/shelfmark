import type { RunBatchedOptions } from './models/run-batched-options.interface';
import type { RunBatchedResult } from './models/run-batched-result.interface';

/**
 * The loop of the purge crons: run `step` until a batch comes back short (nothing left) or the
 * time budget is used up after a full batch; then `anyLeft` decides `hasMore`, so the next
 * scheduled run knows to continue. The budget is only checked between batches.
 */
export async function runBatchedWithBudget(options: RunBatchedOptions): Promise<RunBatchedResult> {
  const clock = options.now ?? Date.now;
  const started = options.startedAt ?? clock();
  let processed = 0;
  for (;;) {
    const count = await options.step();
    processed += count;
    if (count < options.batchSize) return { processed, hasMore: false, budgetEnded: false };
    if (clock() - started >= options.budgetMs) {
      return { processed, hasMore: await options.anyLeft(), budgetEnded: true };
    }
  }
}
