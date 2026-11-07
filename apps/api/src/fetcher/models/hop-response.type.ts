import type { SafeFetchResult } from './safe-fetch-result.interface';

/** Outcome of one request: the final response, or the raw `Location` value of a redirect. */
export type HopResponse = { location: string } | { result: Omit<SafeFetchResult, 'finalUrl'> };
