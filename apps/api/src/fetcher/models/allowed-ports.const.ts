/**
 * Only the standard web ports are fetched. Pages on other ports are rare, and an open port range
 * turns the fetcher into a port scanner for whatever is reachable from the server.
 */
export const DEFAULT_ALLOWED_PORTS: readonly number[] = [80, 443];
