import type { SafeFetchResult } from './safe-fetch-result.interface';

/** Outcome of one request: either the final response or the next URL to follow. */
export type HopResponse = { redirectTo: string } | { result: Omit<SafeFetchResult, 'finalUrl'> };
