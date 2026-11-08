/**
 * Metadata keys of the integration's `@AllowAnonymous()` (`PUBLIC`) and `@OptionalAuth()`
 * (`OPTIONAL`). The session guard reads `Public`; the route scanner spec fails on any `Optional`.
 */
export const AUTH_METADATA_KEY = { Public: 'PUBLIC', Optional: 'OPTIONAL' } as const;
