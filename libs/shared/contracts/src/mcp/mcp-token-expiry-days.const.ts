/**
 * The lifetimes a new personal MCP token may have, in days (Shelf 15-tools "Expires": 30 days,
 * 90 days or Never; `null` in the request is Never). An expired token is refused like a revoked
 * one and stays listed until it is revoked.
 */
export const MCP_TOKEN_EXPIRY_DAYS = [30, 90] as const;
