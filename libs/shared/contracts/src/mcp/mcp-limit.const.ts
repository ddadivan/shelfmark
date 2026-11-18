/**
 * Limits of the Shelfmark MCP server (#395, ADR 0054). `TokensPerUserMax` personal tokens per user
 * (create answers 409 beyond it); a token name is 1 to `NameMax` characters; each token makes at most
 * `CallsPerTokenPerDay` calls per UTC day (429 beyond it). The `search_links` tool returns
 * `SearchLimitDefault` links unless asked for up to `SearchLimitMax`, for a query of at most
 * `QueryMax` characters.
 */
export const MCP_LIMIT = {
  TokensPerUserMax: 10,
  NameMax: 40,
  CallsPerTokenPerDay: 2000,
  SearchLimitDefault: 10,
  SearchLimitMax: 25,
  QueryMax: 200,
} as const;
