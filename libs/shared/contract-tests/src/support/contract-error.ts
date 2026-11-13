/**
 * A failed call, normalised so both runners report the same thing: the HTTP `status` and the
 * `code`, the single-string `message` of the API error body (a contract constant such as
 * `FOLDER_ERROR_MESSAGE.NotFound`), or `null` when there is none (validation lists, plain errors).
 * A failure that is not an HTTP error at all has status 0.
 */
export class ContractError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    detail = '',
  ) {
    super(`HTTP ${status}${code === null ? '' : ` "${code}"`}${detail ? ` (${detail})` : ''}`);
    this.name = 'ContractError';
  }
}
