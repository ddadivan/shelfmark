import type { ContractErrorExpectation } from '../models/contract-error-expectation.interface';
import { ContractError } from './contract-error';

/**
 * Fails unless `call` rejects with a `ContractError` of this status (and `code` when given).
 * A rejection that is not an HTTP error has status 0 and so never matches.
 */
export async function expectError(
  call: Promise<unknown>,
  expected: ContractErrorExpectation,
  what = 'call',
): Promise<void> {
  let failure: unknown;
  try {
    await call;
  } catch (error) {
    failure = error;
  }
  if (failure === undefined) {
    throw new Error(`${what} succeeded, expected HTTP ${expected.status}`);
  }
  if (!(failure instanceof ContractError)) {
    const text = failure instanceof Error ? failure.message : String(failure);
    throw new Error(`${what} failed without an HTTP status (${text}), expected ${expected.status}`);
  }
  if (failure.status !== expected.status) {
    throw new Error(`${what} answered ${failure.message}, expected HTTP ${expected.status}`);
  }
  if (expected.code !== undefined && failure.code !== expected.code) {
    throw new Error(
      `${what} answered ${failure.message}, expected code "${expected.code}" (HTTP ${expected.status})`,
    );
  }
}
