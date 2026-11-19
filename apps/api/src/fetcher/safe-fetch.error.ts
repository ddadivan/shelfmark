import type { SafeFetchErrorCode } from './models/safe-fetch-error-code.type';

/**
 * Raised for every refusal or failure of the fetcher; the message never carries response data.
 * `contentType` is set only for a `NotHtml` refusal: the media type (without parameters) of a
 * response from an address that passed the policy, so a PDF can still be told apart (#537).
 */
export class SafeFetchError extends Error {
  constructor(
    readonly code: SafeFetchErrorCode,
    message: string,
    readonly status?: number,
    readonly contentType?: string,
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}
