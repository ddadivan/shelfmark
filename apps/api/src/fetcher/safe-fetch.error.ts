import type { SafeFetchErrorCode } from './models/safe-fetch-error-code.type';

/** Raised for every refusal or failure of the fetcher; the message never carries response data. */
export class SafeFetchError extends Error {
  constructor(
    readonly code: SafeFetchErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}
