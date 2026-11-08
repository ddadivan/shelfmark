/** Values of `sm-mock-account-deletion`: which failure the mock answers instead of success. */
export const MOCK_ACCOUNT_DELETION_SCENARIO = {
  RateLimited: 'rate-limited',
  ServerError: 'server-error',
} as const;
