import { firstValueFrom, type Observable } from 'rxjs';
import { vi } from 'vitest';
import { toContractError } from './to-contract-error';

/** Longer than the slowest simulated latency of the mock APIs (`MOCK_LATENCY_MS`). */
const PAST_LATENCY_MS = 1000;

/**
 * The value of a mock call without waiting for its simulated latency: the spec runs on fake
 * timers, so the clock is moved past the delay instead. A rejection becomes a `ContractError`.
 */
export async function settle<T>(call: Observable<T>): Promise<T> {
  const outcome = firstValueFrom(call).then(
    (value) => ({ failed: false as const, value }),
    (error: unknown) => ({ failed: true as const, error }),
  );
  await vi.advanceTimersByTimeAsync(PAST_LATENCY_MS);
  const result = await outcome;
  if (result.failed) {
    throw toContractError(result.error);
  }
  return result.value;
}

/** Same for the mocks that answer with a promise. */
export async function settlePromise<T>(call: Promise<T>): Promise<T> {
  try {
    return await call;
  } catch (error) {
    throw toContractError(error);
  }
}
